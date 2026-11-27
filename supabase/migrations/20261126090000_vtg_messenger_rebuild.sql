-- VTG messenger rebuild (2026-11-26).
-- Wipes the old messaging + call backend and recreates it from scratch.
--   * All writes go through SECURITY DEFINER RPCs; clients can only SELECT (RLS: members only).
--   * Clearing a chat PERMANENTLY DELETES its messages (and files) once everyone else agrees.
--     Two people: the other person agreeing is enough. Groups: every other member must agree.
--   * Voice notes, replies, reactions, stars, pins, edit, delete-for-me / for-everyone, receipts.
-- Standing rule kept: private.vtg_message_content_violation (language filter) still guards text.

-- ---------------------------------------------------------------------------------------------
-- 0. Remove the old backend
-- ---------------------------------------------------------------------------------------------
set local check_function_bodies = off;

drop table if exists public.vtg_call_signals cascade;
drop table if exists public.vtg_call_participants cascade;
drop table if exists public.vtg_calls cascade;
drop table if exists public.vtg_chat_clear_responses cascade;
drop table if exists public.vtg_chat_clear_requests cascade;
drop table if exists public.vtg_chat_attachments cascade;
drop table if exists public.vtg_message_reactions cascade;
drop table if exists public.vtg_message_stars cascade;
drop table if exists public.vtg_conversation_pins cascade;
drop table if exists public.vtg_message_read_receipts cascade;
drop table if exists public.vtg_message_delivery_receipts cascade;
drop table if exists public.vtg_message_receipts cascade;
drop table if exists public.vtg_message_hides cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversation_participants cascade;
drop table if exists public.conversations cascade;
drop table if exists private.vtg_chat_orphan_files cascade;

do $$
declare r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'vtg_chat_contacts','vtg_conversation_members','vtg_conversation_sender_roles','vtg_delete_message',
        'vtg_edit_message','vtg_end_call','vtg_forward_message','vtg_join_call','vtg_leave_call',
        'vtg_mark_conversation_read','vtg_mark_message_delivered','vtg_notify_message_participants',
        'vtg_open_conversation','vtg_pending_chat_clear','vtg_pin_message','vtg_request_chat_clear',
        'vtg_respond_chat_clear','vtg_send_call_signal','vtg_send_message','vtg_send_message_with_reply',
        'vtg_start_call','vtg_toggle_message_reaction','vtg_toggle_message_star','vtg_unread_conversation_counts')
  loop
    execute format('drop function if exists %I.%I(%s) cascade', r.nspname, r.proname, r.args);
  end loop;
end $$;

truncate table private.vtg_message_moderation_events;

-- ---------------------------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------------------------
create or replace function private.vtg_is_conversation_member(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = (select auth.uid())
  );
$$;

create or replace function private.vtg_member_name(p_user_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(sp.company_name,''), nullif(bp.bank_name,''), nullif(byp.company_name,''),
                  nullif(p.full_name,''), 'VTG member')
  from public.profiles p
  left join public.supplier_profiles sp on sp.user_id = p.id
  left join public.bank_profiles bp on bp.user_id = p.id
  left join public.buyer_profiles byp on byp.user_id = p.id
  where p.id = p_user_id;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text check (title is null or char_length(title) <= 80),
  is_group boolean not null default false,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants(user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','voice','image','file')),
  body text not null default '',
  reply_to_message_id uuid references public.messages(id) on delete set null,
  forwarded boolean not null default false,
  voice_duration_ms integer check (voice_duration_ms is null or voice_duration_ms between 0 and 3600000),
  voice_waveform jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz not null default now(),
  constraint messages_body_check check (
    char_length(body) <= 4000
    and (deleted_at is not null or kind <> 'text' or char_length(btrim(body)) > 0)
  )
);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index messages_reply_idx on public.messages(reply_to_message_id) where reply_to_message_id is not null;

create table public.vtg_message_hides (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.vtg_message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  played_at timestamptz,
  primary key (message_id, user_id)
);
create index vtg_message_receipts_conv_idx on public.vtg_message_receipts(conversation_id, user_id);

create table public.vtg_message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.vtg_message_stars (
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.vtg_conversation_pins (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  pinned_by uuid not null references public.profiles(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  primary key (conversation_id, message_id)
);

create table public.vtg_chat_attachments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  attachment_type text not null check (attachment_type in ('image','video','audio','document','other')),
  created_at timestamptz not null default now()
);
create index vtg_chat_attachments_message_idx on public.vtg_chat_attachments(message_id);

create table public.vtg_chat_clear_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','declined','cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index vtg_chat_clear_one_pending on public.vtg_chat_clear_requests(conversation_id) where status = 'pending';

create table public.vtg_chat_clear_responses (
  request_id uuid not null references public.vtg_chat_clear_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  approved boolean not null,
  responded_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

-- Files whose messages were deleted. Clients remove them from storage, then they are forgotten.
create table private.vtg_chat_orphan_files (
  storage_path text primary key,
  conversation_id uuid not null,
  created_at timestamptz not null default now()
);

-- Calls (same behaviour as before, recreated on the new tables)
create table public.vtg_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  kind text not null check (kind in ('voice','video')),
  started_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','ended')),
  max_participants integer not null default 5,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index vtg_calls_one_active on public.vtg_calls(conversation_id) where status = 'active';
create table public.vtg_call_participants (
  call_id uuid not null references public.vtg_calls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (call_id, user_id)
);
create table public.vtg_call_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.vtg_calls(id) on delete cascade,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('offer','answer','candidate')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index vtg_call_signals_to_idx on public.vtg_call_signals(to_user, created_at);

alter table private.vtg_message_moderation_events
  add constraint vtg_message_moderation_events_conversation_id_fkey
  foreign key (conversation_id) references public.conversations(id) on delete cascade;

-- ---------------------------------------------------------------------------------------------
-- 3. Row level security: members read, nobody writes directly
-- ---------------------------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.vtg_message_hides enable row level security;
alter table public.vtg_message_receipts enable row level security;
alter table public.vtg_message_reactions enable row level security;
alter table public.vtg_message_stars enable row level security;
alter table public.vtg_conversation_pins enable row level security;
alter table public.vtg_chat_attachments enable row level security;
alter table public.vtg_chat_clear_requests enable row level security;
alter table public.vtg_chat_clear_responses enable row level security;
alter table public.vtg_calls enable row level security;
alter table public.vtg_call_participants enable row level security;
alter table public.vtg_call_signals enable row level security;

create policy "members read conversations" on public.conversations for select to authenticated
  using (private.vtg_is_conversation_member(id) or private.vtg_is_admin());
create policy "members read participants" on public.conversation_participants for select to authenticated
  using (user_id = (select auth.uid()) or private.vtg_is_conversation_member(conversation_id) or private.vtg_is_admin());
create policy "members read messages" on public.messages for select to authenticated
  using (private.vtg_is_conversation_member(conversation_id) or private.vtg_is_admin());
create policy "members read own hides" on public.vtg_message_hides for select to authenticated
  using (user_id = (select auth.uid()));
create policy "members read receipts" on public.vtg_message_receipts for select to authenticated
  using (private.vtg_is_conversation_member(conversation_id));
create policy "members read reactions" on public.vtg_message_reactions for select to authenticated
  using (private.vtg_is_conversation_member(conversation_id));
create policy "members read own stars" on public.vtg_message_stars for select to authenticated
  using (user_id = (select auth.uid()));
create policy "members read pins" on public.vtg_conversation_pins for select to authenticated
  using (private.vtg_is_conversation_member(conversation_id));
create policy "members read attachments" on public.vtg_chat_attachments for select to authenticated
  using (private.vtg_is_conversation_member(conversation_id));
create policy "members read clear requests" on public.vtg_chat_clear_requests for select to authenticated
  using (private.vtg_is_conversation_member(conversation_id));
create policy "members read clear responses" on public.vtg_chat_clear_responses for select to authenticated
  using (exists (select 1 from public.vtg_chat_clear_requests r
                 where r.id = request_id and private.vtg_is_conversation_member(r.conversation_id)));
create policy "members read calls" on public.vtg_calls for select to authenticated
  using (private.vtg_is_conversation_member(conversation_id));
create policy "members read call participants" on public.vtg_call_participants for select to authenticated
  using (exists (select 1 from public.vtg_calls c where c.id = call_id and private.vtg_is_conversation_member(c.conversation_id)));
create policy "recipient reads own call signals" on public.vtg_call_signals for select to authenticated
  using (to_user = (select auth.uid()));

revoke all on public.conversations, public.conversation_participants, public.messages, public.vtg_message_hides,
  public.vtg_message_receipts, public.vtg_message_reactions, public.vtg_message_stars, public.vtg_conversation_pins,
  public.vtg_chat_attachments, public.vtg_chat_clear_requests, public.vtg_chat_clear_responses,
  public.vtg_calls, public.vtg_call_participants, public.vtg_call_signals from anon, authenticated, public;
grant select on public.conversations, public.conversation_participants, public.messages, public.vtg_message_hides,
  public.vtg_message_receipts, public.vtg_message_reactions, public.vtg_message_stars, public.vtg_conversation_pins,
  public.vtg_chat_attachments, public.vtg_chat_clear_requests, public.vtg_chat_clear_responses,
  public.vtg_calls, public.vtg_call_participants, public.vtg_call_signals to authenticated;
revoke all on private.vtg_chat_orphan_files from anon, authenticated, public;

-- Realtime
do $$
declare t text;
begin
  foreach t in array array['messages','vtg_message_receipts','vtg_message_reactions','vtg_conversation_pins',
                           'vtg_chat_attachments','vtg_chat_clear_requests','vtg_calls','vtg_call_participants','vtg_call_signals']
  loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Storage: any member of the chat may remove files of that chat (needed when a chat is cleared).
drop policy if exists "uploaders delete chat attachment objects" on storage.objects;
create policy "chat members delete attachment objects" on storage.objects for delete to authenticated
  using (bucket_id = 'vtg-chat-attachments'
         and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and private.vtg_is_conversation_member(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------------------------------
create or replace function private.vtg_message_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  -- One unread notification per chat and person, so a busy chat does not flood the bell.
  insert into public.vtg_notifications(user_id, title, body, notification_type, entity_type, entity_id)
  select cp.user_id, 'New trade message',
         case new.kind when 'voice' then 'Voice message' when 'image' then 'Photo' when 'file' then 'File'
              else left(new.body, 220) end,
         'message', 'conversation', new.conversation_id
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id and cp.user_id <> new.sender_id
    and not exists (select 1 from public.vtg_notifications n
                    where n.user_id = cp.user_id and n.notification_type = 'message'
                      and n.entity_id = new.conversation_id and n.read_at is null);
  return new;
end $$;
create trigger vtg_message_after_insert after insert on public.messages
  for each row execute function private.vtg_message_after_insert();

-- ---------------------------------------------------------------------------------------------
-- 5. Contacts and conversations
-- ---------------------------------------------------------------------------------------------
create function public.vtg_chat_contacts()
returns table(user_id uuid, display_name text, role text)
language sql stable security definer set search_path = 'public', 'private', 'pg_temp' as $$
  select p.id, private.vtg_member_name(p.id), p.role::text
  from public.profiles p
  where p.is_active = true and p.account_environment = 'trade'
    and private.vtg_trade_linked((select auth.uid()), p.id)
  order by 2;
$$;

create function public.vtg_open_conversation(p_partner_ids uuid[], p_title text default null)
returns uuid language plpgsql security definer set search_path = 'public', 'private', 'pg_temp' as $$
declare me uuid := auth.uid(); partners uuid[]; existing uuid; new_id uuid; pid uuid;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = me and is_active = true) then
    raise exception 'Active VTG account required' using errcode = '42501';
  end if;
  select array_agg(distinct x) into partners from unnest(p_partner_ids) x where x is not null and x <> me;
  if partners is null or cardinality(partners) < 1 or cardinality(partners) > 4 then
    raise exception 'Choose between 1 and 4 trade partners';
  end if;
  foreach pid in array partners loop
    if not private.vtg_trade_linked(me, pid)
       or not exists (select 1 from public.profiles where id = pid and is_active = true and account_environment = 'trade') then
      raise exception 'You can only message partners linked to your trade records';
    end if;
  end loop;
  select c.id into existing from public.conversations c
  where (select array_agg(cp.user_id order by cp.user_id) from public.conversation_participants cp where cp.conversation_id = c.id)
        = (select array_agg(u order by u) from unnest(partners || me) u)
  limit 1;
  if existing is not null then return existing; end if;
  insert into public.conversations(created_by, title, is_group)
  values (me, nullif(left(btrim(coalesce(p_title,'')),80),''), cardinality(partners) > 1) returning id into new_id;
  insert into public.conversation_participants(conversation_id, user_id) select new_id, u from unnest(partners || me) u;
  return new_id;
end $$;

create function public.vtg_list_conversations()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(t.x order by (t.x->>'last_message_at') desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', c.id, 'title', c.title, 'is_group', c.is_group, 'last_message_at', c.last_message_at,
      'members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', p.id, 'name', private.vtg_member_name(p.id), 'role', p.role::text)
                                            order by private.vtg_member_name(p.id)), '[]'::jsonb)
                  from public.conversation_participants cp2 join public.profiles p on p.id = cp2.user_id
                  where cp2.conversation_id = c.id),
      'last', (select jsonb_build_object('id', m.id, 'kind', m.kind, 'body', left(m.body, 120), 'sender_id', m.sender_id,
                                         'created_at', m.created_at, 'deleted', m.deleted_at is not null)
               from public.messages m
               where m.conversation_id = c.id
                 and not exists (select 1 from public.vtg_message_hides h where h.message_id = m.id and h.user_id = (select auth.uid()))
               order by m.created_at desc limit 1),
      'unread', (select count(*) from public.messages m
                 where m.conversation_id = c.id and m.sender_id <> (select auth.uid()) and m.deleted_at is null
                   and not exists (select 1 from public.vtg_message_hides h where h.message_id = m.id and h.user_id = (select auth.uid()))
                   and not exists (select 1 from public.vtg_message_receipts r
                                   where r.message_id = m.id and r.user_id = (select auth.uid()) and r.read_at is not null)),
      'live_call', (select jsonb_build_object('id', k.id, 'kind', k.kind, 'started_by', k.started_by)
                    from public.vtg_calls k where k.conversation_id = c.id and k.status = 'active' limit 1)
    ) as x
    from public.conversations c
    where private.vtg_is_conversation_member(c.id)
  ) t;
$$;

-- ---------------------------------------------------------------------------------------------
-- 6. Messages
-- ---------------------------------------------------------------------------------------------
create function public.vtg_get_messages(p_conversation_id uuid, p_limit integer default 200)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid(); result jsonb;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not private.vtg_is_conversation_member(p_conversation_id) then
    raise exception 'You are not a participant in this chat' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'sender_id', m.sender_id, 'kind', m.kind,
    'body', case when m.deleted_at is not null then '' else m.body end,
    'created_at', m.created_at, 'edited_at', m.edited_at, 'deleted', m.deleted_at is not null,
    'forwarded', m.forwarded, 'voice_duration_ms', m.voice_duration_ms, 'voice_waveform', m.voice_waveform,
    'reply', (select jsonb_build_object('id', r.id, 'sender_id', r.sender_id, 'kind', r.kind,
                                         'body', case when r.deleted_at is not null then '' else left(r.body, 140) end,
                                         'deleted', r.deleted_at is not null)
              from public.messages r where r.id = m.reply_to_message_id),
    'reactions', (select coalesce(jsonb_agg(jsonb_build_object('emoji', x.emoji, 'user_id', x.user_id)), '[]'::jsonb)
                  from public.vtg_message_reactions x where x.message_id = m.id),
    'starred', exists (select 1 from public.vtg_message_stars s where s.message_id = m.id and s.user_id = me),
    'pinned', exists (select 1 from public.vtg_conversation_pins pn where pn.message_id = m.id),
    'status', case when m.sender_id = me then
        (select case when t.total > 0 and t.reads = t.total then 'read'
                     when t.total > 0 and t.delivered = t.total then 'delivered' else 'sent' end
         from (select (select count(*) from public.conversation_participants cp where cp.conversation_id = m.conversation_id and cp.user_id <> m.sender_id) as total,
                      (select count(*) from public.vtg_message_receipts rc where rc.message_id = m.id and rc.user_id <> m.sender_id and rc.read_at is not null) as reads,
                      (select count(*) from public.vtg_message_receipts rc where rc.message_id = m.id and rc.user_id <> m.sender_id and rc.delivered_at is not null) as delivered) t)
      else null end,
    'played', exists (select 1 from public.vtg_message_receipts rc where rc.message_id = m.id and rc.user_id <> m.sender_id and rc.played_at is not null),
    'attachments', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'path', a.storage_path, 'name', a.original_name,
                                  'mime', a.mime_type, 'size', a.size_bytes, 'kind', a.attachment_type)), '[]'::jsonb)
                    from public.vtg_chat_attachments a where a.message_id = m.id)
  ) order by m.created_at), '[]'::jsonb)
  into result
  from (
    select * from public.messages mm
    where mm.conversation_id = p_conversation_id
      and not exists (select 1 from public.vtg_message_hides h where h.message_id = mm.id and h.user_id = me)
    order by mm.created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
  ) m;
  return result;
end $$;

create function private.vtg_check_send(p_conversation_id uuid, p_reply_to uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in required to send a message' using errcode = '42501'; end if;
  if p_conversation_id is null then raise exception 'Choose a conversation first'; end if;
  if not exists (select 1 from public.profiles p where p.id = me and p.is_active = true) then
    raise exception 'An active VTG account is required to send messages' using errcode = '42501';
  end if;
  if not private.vtg_is_conversation_member(p_conversation_id) then
    raise exception 'You are not a participant in this conversation' using errcode = '42501';
  end if;
  if (select count(*) from public.messages where sender_id = me and created_at > now() - interval '10 seconds') >= 20 then
    raise exception 'You are sending messages too quickly. Please wait a moment.';
  end if;
  if p_reply_to is not null and not exists (select 1 from public.messages where id = p_reply_to and conversation_id = p_conversation_id) then
    raise exception 'The message you are replying to is no longer available';
  end if;
  return me;
end $$;

create function private.vtg_violation_result(p_user uuid, p_conversation_id uuid, p_text text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_category text; v_warnings integer;
begin
  v_category := private.vtg_message_content_violation(p_text);
  if v_category is null then return null; end if;
  insert into private.vtg_message_moderation_events(user_id, conversation_id, category) values (p_user, p_conversation_id, v_category);
  select count(*)::integer into v_warnings from private.vtg_message_moderation_events
   where user_id = p_user and created_at >= now() - interval '30 days';
  return jsonb_build_object('ok', false, 'violation', true, 'category', v_category, 'warning_count', v_warnings,
    'message', 'This message was not sent. VTG does not allow sexually explicit, abusive, or threatening messages. Please rewrite it respectfully.');
end $$;

create function public.vtg_send_message(p_conversation_id uuid, p_body text, p_reply_to uuid default null, p_forwarded boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid; v_body text := btrim(coalesce(p_body, '')); v_viol jsonb; v_id uuid;
begin
  me := private.vtg_check_send(p_conversation_id, p_reply_to);
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then raise exception 'Messages must contain between 1 and 4000 characters'; end if;
  v_viol := private.vtg_violation_result(me, p_conversation_id, v_body);
  if v_viol is not null then return v_viol; end if;
  insert into public.messages(conversation_id, sender_id, kind, body, reply_to_message_id, forwarded)
  values (p_conversation_id, me, 'text', v_body, p_reply_to, coalesce(p_forwarded, false)) returning id into v_id;
  return jsonb_build_object('ok', true, 'message_id', v_id);
end $$;

create function public.vtg_send_voice_note(
  p_conversation_id uuid, p_storage_path text, p_duration_ms integer, p_waveform jsonb,
  p_mime text, p_size bigint, p_reply_to uuid default null, p_forwarded boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid; v_id uuid;
begin
  me := private.vtg_check_send(p_conversation_id, p_reply_to);
  if p_storage_path is null or left(p_storage_path, 74) <> p_conversation_id::text || '/' || me::text || '/' then
    raise exception 'Invalid voice note location';
  end if;
  if coalesce(p_mime, '') !~ '^audio/' then raise exception 'A voice note must be an audio recording'; end if;
  if p_size is null or p_size < 1 or p_size > 10485760 then raise exception 'Voice note is too large (10 MB maximum)'; end if;
  if p_duration_ms is null or p_duration_ms < 300 or p_duration_ms > 900000 then raise exception 'Voice notes can be 1 second to 15 minutes long'; end if;
  if p_waveform is not null and (jsonb_typeof(p_waveform) <> 'array' or jsonb_array_length(p_waveform) > 120) then
    raise exception 'Invalid waveform';
  end if;
  insert into public.messages(conversation_id, sender_id, kind, body, reply_to_message_id, forwarded, voice_duration_ms, voice_waveform)
  values (p_conversation_id, me, 'voice', '', p_reply_to, coalesce(p_forwarded, false), p_duration_ms, p_waveform) returning id into v_id;
  insert into public.vtg_chat_attachments(conversation_id, message_id, uploaded_by, storage_path, original_name, mime_type, size_bytes, attachment_type)
  values (p_conversation_id, v_id, me, p_storage_path, 'Voice message', left(p_mime, 100), p_size, 'audio');
  return jsonb_build_object('ok', true, 'message_id', v_id);
end $$;

create function public.vtg_send_file_message(
  p_conversation_id uuid, p_files jsonb, p_caption text default '', p_reply_to uuid default null, p_forwarded boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid; f jsonb; v_cap text := btrim(coalesce(p_caption, '')); v_viol jsonb; v_id uuid; v_kind text := 'image';
        v_mime text; v_att text; n integer;
begin
  me := private.vtg_check_send(p_conversation_id, p_reply_to);
  if p_files is null or jsonb_typeof(p_files) <> 'array' then raise exception 'Attach at least one file'; end if;
  n := jsonb_array_length(p_files);
  if n < 1 or n > 5 then raise exception 'Attach between 1 and 5 files'; end if;
  if char_length(v_cap) > 1000 then raise exception 'Captions are limited to 1000 characters'; end if;
  if v_cap <> '' then
    v_viol := private.vtg_violation_result(me, p_conversation_id, v_cap);
    if v_viol is not null then return v_viol; end if;
  end if;
  for f in select * from jsonb_array_elements(p_files) loop
    if left(coalesce(f->>'path', ''), 74) <> p_conversation_id::text || '/' || me::text || '/' then raise exception 'Invalid file location'; end if;
    if coalesce((f->>'size')::bigint, 0) < 1 or (f->>'size')::bigint > 26214400 then raise exception 'Files can be up to 25 MB'; end if;
    if coalesce(f->>'mime', '') !~ '^[a-z]+/[a-z0-9.+-]+$' then raise exception 'Unsupported file type'; end if;
    if (f->>'mime') not like 'image/%' then v_kind := 'file'; end if;
  end loop;
  insert into public.messages(conversation_id, sender_id, kind, body, reply_to_message_id, forwarded)
  values (p_conversation_id, me, v_kind, v_cap, p_reply_to, coalesce(p_forwarded, false)) returning id into v_id;
  for f in select * from jsonb_array_elements(p_files) loop
    v_mime := f->>'mime';
    v_att := case when v_mime like 'image/%' then 'image' when v_mime like 'video/%' then 'video'
                  when v_mime like 'audio/%' then 'audio' when v_mime in ('application/pdf','text/plain','text/csv') or v_mime like 'application/%' then 'document' else 'other' end;
    insert into public.vtg_chat_attachments(conversation_id, message_id, uploaded_by, storage_path, original_name, mime_type, size_bytes, attachment_type)
    values (p_conversation_id, v_id, me, f->>'path', left(coalesce(nullif(f->>'name', ''), 'file'), 255), v_mime, (f->>'size')::bigint, v_att);
  end loop;
  return jsonb_build_object('ok', true, 'message_id', v_id);
end $$;

create function public.vtg_edit_message(p_message_id uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.messages%rowtype; v_body text := btrim(coalesce(p_body, '')); v_viol jsonb;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into m from public.messages where id = p_message_id for update;
  if not found or m.sender_id <> me or not private.vtg_is_conversation_member(m.conversation_id) then
    raise exception 'You can only edit your own messages' using errcode = '42501';
  end if;
  if m.deleted_at is not null or m.kind <> 'text' then raise exception 'This message cannot be edited'; end if;
  if m.created_at < now() - interval '15 minutes' then raise exception 'Messages can be edited for 15 minutes after they are sent'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then raise exception 'Messages must contain between 1 and 4000 characters'; end if;
  if v_body = m.body then return jsonb_build_object('ok', true); end if;
  v_viol := private.vtg_violation_result(me, m.conversation_id, v_body);
  if v_viol is not null then return v_viol; end if;
  update public.messages set body = v_body, edited_at = now() where id = p_message_id;
  return jsonb_build_object('ok', true);
end $$;

create function public.vtg_delete_message(p_message_id uuid, p_for_everyone boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.messages%rowtype;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into m from public.messages where id = p_message_id for update;
  if not found or not private.vtg_is_conversation_member(m.conversation_id) then
    raise exception 'Message not found' using errcode = '42501';
  end if;
  if not coalesce(p_for_everyone, false) then
    insert into public.vtg_message_hides(message_id, user_id) values (p_message_id, me) on conflict do nothing;
    delete from public.vtg_message_stars where message_id = p_message_id and user_id = me;
    return jsonb_build_object('ok', true, 'scope', 'me');
  end if;
  if m.sender_id <> me then raise exception 'You can only delete your own messages for everyone' using errcode = '42501'; end if;
  if m.deleted_at is not null then return jsonb_build_object('ok', true, 'scope', 'everyone'); end if;
  if m.created_at < now() - interval '48 hours' then raise exception 'Messages can be deleted for everyone within 48 hours'; end if;
  insert into private.vtg_chat_orphan_files(storage_path, conversation_id)
    select a.storage_path, a.conversation_id from public.vtg_chat_attachments a where a.message_id = p_message_id
    on conflict do nothing;
  delete from public.vtg_chat_attachments where message_id = p_message_id;
  delete from public.vtg_message_reactions where message_id = p_message_id;
  delete from public.vtg_message_stars where message_id = p_message_id;
  delete from public.vtg_conversation_pins where message_id = p_message_id;
  update public.messages set body = '', deleted_at = now(), deleted_by = me, voice_waveform = null, voice_duration_ms = null
   where id = p_message_id;
  return jsonb_build_object('ok', true, 'scope', 'everyone');
end $$;

create function public.vtg_toggle_reaction(p_message_id uuid, p_emoji text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.messages%rowtype; cur text;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into m from public.messages where id = p_message_id;
  if not found or not private.vtg_is_conversation_member(m.conversation_id) or m.deleted_at is not null then
    raise exception 'Message not found' using errcode = '42501';
  end if;
  if char_length(coalesce(p_emoji, '')) not between 1 and 16 then raise exception 'Invalid reaction'; end if;
  select emoji into cur from public.vtg_message_reactions where message_id = p_message_id and user_id = me;
  if cur = p_emoji then
    delete from public.vtg_message_reactions where message_id = p_message_id and user_id = me;
    return jsonb_build_object('ok', true, 'emoji', null);
  end if;
  insert into public.vtg_message_reactions(message_id, conversation_id, user_id, emoji)
  values (p_message_id, m.conversation_id, me, p_emoji)
  on conflict (message_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  return jsonb_build_object('ok', true, 'emoji', p_emoji);
end $$;

create function public.vtg_toggle_star(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.messages%rowtype;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into m from public.messages where id = p_message_id;
  if not found or not private.vtg_is_conversation_member(m.conversation_id) or m.deleted_at is not null then
    raise exception 'Message not found' using errcode = '42501';
  end if;
  if exists (select 1 from public.vtg_message_stars where message_id = p_message_id and user_id = me) then
    delete from public.vtg_message_stars where message_id = p_message_id and user_id = me; return false;
  end if;
  insert into public.vtg_message_stars(message_id, conversation_id, user_id) values (p_message_id, m.conversation_id, me);
  return true;
end $$;

create function public.vtg_toggle_pin(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.messages%rowtype;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into m from public.messages where id = p_message_id;
  if not found or not private.vtg_is_conversation_member(m.conversation_id) or m.deleted_at is not null then
    raise exception 'Message not found' using errcode = '42501';
  end if;
  if exists (select 1 from public.vtg_conversation_pins where message_id = p_message_id) then
    delete from public.vtg_conversation_pins where message_id = p_message_id; return false;
  end if;
  if (select count(*) from public.vtg_conversation_pins where conversation_id = m.conversation_id) >= 3 then
    raise exception 'You can pin up to 3 messages. Unpin one first.';
  end if;
  insert into public.vtg_conversation_pins(conversation_id, message_id, pinned_by) values (m.conversation_id, p_message_id, me);
  return true;
end $$;

-- Receipts ---------------------------------------------------------------------------------
create function public.vtg_mark_delivered(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or not private.vtg_is_conversation_member(p_conversation_id) then return; end if;
  insert into public.vtg_message_receipts(message_id, conversation_id, user_id, delivered_at)
  select m.id, m.conversation_id, me, now() from public.messages m
  where m.conversation_id = p_conversation_id and m.sender_id <> me
    and not exists (select 1 from public.vtg_message_receipts r where r.message_id = m.id and r.user_id = me)
  on conflict (message_id, user_id) do nothing;
end $$;

create function public.vtg_mark_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or not private.vtg_is_conversation_member(p_conversation_id) then return; end if;
  insert into public.vtg_message_receipts(message_id, conversation_id, user_id, delivered_at, read_at)
  select m.id, m.conversation_id, me, now(), now() from public.messages m
  where m.conversation_id = p_conversation_id and m.sender_id <> me
  on conflict (message_id, user_id) do update
    set read_at = coalesce(public.vtg_message_receipts.read_at, now()),
        delivered_at = coalesce(public.vtg_message_receipts.delivered_at, now());
  update public.vtg_notifications set read_at = now()
   where user_id = me and notification_type = 'message' and entity_id = p_conversation_id and read_at is null;
end $$;

create function public.vtg_mark_played(p_message_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.messages%rowtype;
begin
  if me is null then return; end if;
  select * into m from public.messages where id = p_message_id;
  if not found or m.kind <> 'voice' or m.sender_id = me or not private.vtg_is_conversation_member(m.conversation_id) then return; end if;
  insert into public.vtg_message_receipts(message_id, conversation_id, user_id, delivered_at, read_at, played_at)
  values (m.id, m.conversation_id, me, now(), now(), now())
  on conflict (message_id, user_id) do update
    set played_at = coalesce(public.vtg_message_receipts.played_at, now()),
        read_at = coalesce(public.vtg_message_receipts.read_at, now()),
        delivered_at = coalesce(public.vtg_message_receipts.delivered_at, now());
end $$;

create function public.vtg_message_info(p_message_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.messages%rowtype;
begin
  select * into m from public.messages where id = p_message_id;
  if me is null or not found or m.sender_id <> me then raise exception 'Message info is available for your own messages' using errcode = '42501'; end if;
  return jsonb_build_object('sent_at', m.created_at, 'recipients',
    (select coalesce(jsonb_agg(jsonb_build_object('user_id', cp.user_id, 'name', private.vtg_member_name(cp.user_id),
       'delivered_at', r.delivered_at, 'read_at', r.read_at, 'played_at', r.played_at) order by private.vtg_member_name(cp.user_id)), '[]'::jsonb)
     from public.conversation_participants cp
     left join public.vtg_message_receipts r on r.message_id = m.id and r.user_id = cp.user_id
     where cp.conversation_id = m.conversation_id and cp.user_id <> me));
end $$;

-- ---------------------------------------------------------------------------------------------
-- 7. Clear chat: permanent deletion once everyone else agrees
-- ---------------------------------------------------------------------------------------------
create function private.vtg_perform_chat_clear(p_conversation_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into private.vtg_chat_orphan_files(storage_path, conversation_id)
    select distinct a.storage_path, a.conversation_id from public.vtg_chat_attachments a where a.conversation_id = p_conversation_id
    on conflict do nothing;
  with gone as (delete from public.messages where conversation_id = p_conversation_id returning 1)
  select count(*) into n from gone;       -- cascades: attachments, receipts, reactions, stars, pins, hides
  update public.conversations set last_message_at = now() where id = p_conversation_id;
  return n;
end $$;

create function public.vtg_request_chat_clear(p_conversation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); v_req uuid; v_total integer; v_name text;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  perform 1 from public.conversations where id = p_conversation_id for update;
  if not found or not private.vtg_is_conversation_member(p_conversation_id) then
    raise exception 'You are not a participant in this chat' using errcode = '42501';
  end if;
  if exists (select 1 from public.vtg_chat_clear_requests where conversation_id = p_conversation_id and status = 'pending') then
    return jsonb_build_object('ok', false, 'message', 'A clear request is already waiting for an answer.');
  end if;
  insert into public.vtg_chat_clear_requests(conversation_id, requested_by) values (p_conversation_id, me) returning id into v_req;
  insert into public.vtg_chat_clear_responses(request_id, user_id, approved) values (v_req, me, true);
  select count(*)::integer into v_total from public.conversation_participants where conversation_id = p_conversation_id;
  if v_total <= 1 then
    perform private.vtg_perform_chat_clear(p_conversation_id);
    update public.vtg_chat_clear_requests set status = 'approved', resolved_at = now() where id = v_req;
    return jsonb_build_object('ok', true, 'cleared', true, 'message', 'Chat cleared.');
  end if;
  v_name := private.vtg_member_name(me);
  insert into public.vtg_notifications(user_id, title, body, notification_type, entity_type, entity_id)
  select cp.user_id, 'Clear chat request', v_name || ' wants to clear this chat for everyone. Open Messages to agree or decline.',
         'chat_clear_request', 'conversation', p_conversation_id
  from public.conversation_participants cp where cp.conversation_id = p_conversation_id and cp.user_id <> me;
  return jsonb_build_object('ok', true, 'cleared', false, 'request_id', v_req,
    'message', 'Request sent. The chat is deleted for everyone as soon as the other participant' || case when v_total > 2 then 's agree.' else ' agrees.' end);
end $$;

create function public.vtg_respond_chat_clear(p_request_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); r public.vtg_chat_clear_requests%rowtype; v_missing integer; v_deleted integer;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into r from public.vtg_chat_clear_requests where id = p_request_id for update;
  if not found or not private.vtg_is_conversation_member(r.conversation_id) then
    raise exception 'Clear request not found for this chat' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    return jsonb_build_object('ok', false, 'cleared', false, 'message', 'This request has already been answered.');
  end if;
  insert into public.vtg_chat_clear_responses(request_id, user_id, approved) values (p_request_id, me, coalesce(p_approve, false))
  on conflict (request_id, user_id) do update set approved = excluded.approved, responded_at = now();
  if not coalesce(p_approve, false) then
    update public.vtg_chat_clear_requests set status = 'declined', resolved_at = now() where id = p_request_id;
    insert into public.vtg_notifications(user_id, title, body, notification_type, entity_type, entity_id)
    select cp.user_id, 'Clear chat declined', 'The request to clear this chat was declined. Nothing was deleted.',
           'chat_clear_result', 'conversation', r.conversation_id
    from public.conversation_participants cp where cp.conversation_id = r.conversation_id;
    return jsonb_build_object('ok', true, 'cleared', false, 'message', 'You declined. Nothing was deleted.');
  end if;
  select count(*)::integer into v_missing from public.conversation_participants cp
   where cp.conversation_id = r.conversation_id
     and not exists (select 1 from public.vtg_chat_clear_responses x where x.request_id = p_request_id and x.user_id = cp.user_id and x.approved);
  if v_missing = 0 then
    v_deleted := private.vtg_perform_chat_clear(r.conversation_id);
    update public.vtg_chat_clear_requests set status = 'approved', resolved_at = now() where id = p_request_id;
    insert into public.vtg_notifications(user_id, title, body, notification_type, entity_type, entity_id)
    select cp.user_id, 'Chat cleared', 'Everyone agreed. The chat history was permanently deleted.',
           'chat_clear_result', 'conversation', r.conversation_id
    from public.conversation_participants cp where cp.conversation_id = r.conversation_id;
    return jsonb_build_object('ok', true, 'cleared', true, 'deleted', v_deleted, 'message', 'Chat cleared for everyone.');
  end if;
  return jsonb_build_object('ok', true, 'cleared', false, 'message', 'Agreed. Waiting for the other participants.');
end $$;

create function public.vtg_cancel_chat_clear(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); r public.vtg_chat_clear_requests%rowtype;
begin
  select * into r from public.vtg_chat_clear_requests where id = p_request_id for update;
  if me is null or not found or r.requested_by <> me then raise exception 'Only the person who asked can cancel' using errcode = '42501'; end if;
  if r.status = 'pending' then
    update public.vtg_chat_clear_requests set status = 'cancelled', resolved_at = now() where id = p_request_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create function public.vtg_pending_chat_clear(p_conversation_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid(); r public.vtg_chat_clear_requests%rowtype;
begin
  if me is null or not private.vtg_is_conversation_member(p_conversation_id) then return null; end if;
  select * into r from public.vtg_chat_clear_requests where conversation_id = p_conversation_id and status = 'pending';
  if not found then return null; end if;
  return jsonb_build_object('id', r.id, 'requested_by', r.requested_by, 'requester_name', private.vtg_member_name(r.requested_by),
    'created_at', r.created_at, 'mine', r.requested_by = me,
    'approvals', (select count(*) from public.vtg_chat_clear_responses x where x.request_id = r.id and x.approved),
    'total', (select count(*) from public.conversation_participants cp where cp.conversation_id = r.conversation_id),
    'i_approved', exists (select 1 from public.vtg_chat_clear_responses x where x.request_id = r.id and x.user_id = me and x.approved));
end $$;

create function public.vtg_claim_orphan_chat_files(p_conversation_id uuid)
returns text[] language plpgsql security definer set search_path = '' as $$
declare paths text[];
begin
  if auth.uid() is null or not private.vtg_is_conversation_member(p_conversation_id) then return '{}'; end if;
  with taken as (
    delete from private.vtg_chat_orphan_files o where o.conversation_id = p_conversation_id returning o.storage_path)
  select coalesce(array_agg(t.storage_path), '{}') into paths from taken t
   where not exists (select 1 from public.vtg_chat_attachments a where a.storage_path = t.storage_path);
  return paths;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 8. Calls (same rules as before)
-- ---------------------------------------------------------------------------------------------
create function public.vtg_end_call(p_call_id uuid)
returns void language plpgsql security definer set search_path = 'public', 'private', 'pg_temp' as $$
declare me uuid := auth.uid(); v_call public.vtg_calls%rowtype;
begin
 if me is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into v_call from public.vtg_calls where id=p_call_id for update;
 if not found then raise exception 'Call not found'; end if;
 if v_call.started_by <> me then raise exception 'Only the person who started this call can end it for everyone' using errcode='42501'; end if;
 if v_call.status='ended' then return; end if;
 update public.vtg_calls set status='ended',ended_at=now() where id=p_call_id and status='active';
 update public.vtg_call_participants set left_at=coalesce(left_at,now()) where call_id=p_call_id and left_at is null;
 delete from public.vtg_call_signals where call_id=p_call_id;
end $$;

create function public.vtg_join_call(p_call_id uuid)
returns uuid language plpgsql security definer set search_path = 'public', 'private', 'pg_temp' as $$
declare me uuid := auth.uid(); c public.vtg_calls%rowtype; live integer;
begin
  select * into c from public.vtg_calls where id = p_call_id for update;
  if not found or c.status <> 'active' then raise exception 'This call has ended'; end if;
  if me is null or not private.vtg_is_conversation_member(c.conversation_id) then
    raise exception 'Only conversation participants can join this call' using errcode = '42501';
  end if;
  if exists (select 1 from public.vtg_call_participants where call_id = p_call_id and user_id = me and left_at is null) then return p_call_id; end if;
  select count(*) into live from public.vtg_call_participants where call_id = p_call_id and left_at is null;
  if live >= c.max_participants then raise exception 'This call is full (maximum % participants)', c.max_participants; end if;
  insert into public.vtg_call_participants(call_id, user_id) values (p_call_id, me)
  on conflict (call_id, user_id) do update set left_at = null, joined_at = now();
  return p_call_id;
end $$;

create function public.vtg_leave_call(p_call_id uuid)
returns void language plpgsql security definer set search_path = 'public', 'private', 'pg_temp' as $$
declare me uuid := auth.uid(); v_call public.vtg_calls%rowtype;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into v_call from public.vtg_calls where id = p_call_id for update;
  if not found then raise exception 'Call not found'; end if;
  if v_call.status = 'ended' then return; end if;
  if not exists (select 1 from public.vtg_call_participants where call_id = p_call_id and user_id = me and left_at is null) then
    raise exception 'Only an active call participant can leave this call' using errcode = '42501';
  end if;
  if v_call.started_by = me then
    update public.vtg_calls set status = 'ended', ended_at = now() where id = p_call_id and status = 'active';
    update public.vtg_call_participants set left_at = coalesce(left_at, now()) where call_id = p_call_id and left_at is null;
    delete from public.vtg_call_signals where call_id = p_call_id;
    return;
  end if;
  update public.vtg_call_participants set left_at = now() where call_id = p_call_id and user_id = me and left_at is null;
  if not exists (select 1 from public.vtg_call_participants where call_id = p_call_id and left_at is null) then
    update public.vtg_calls set status = 'ended', ended_at = now() where id = p_call_id and status = 'active';
    delete from public.vtg_call_signals where call_id = p_call_id;
  end if;
end $$;

create function public.vtg_send_call_signal(p_call_id uuid, p_to_user uuid, p_kind text, p_payload jsonb)
returns void language plpgsql security definer set search_path = 'public', 'private', 'pg_temp' as $$
declare me uuid := auth.uid();
begin
  if p_kind not in ('offer','answer','candidate') or p_payload is null or pg_column_size(p_payload) > 16384 then
    raise exception 'Invalid call signal';
  end if;
  if not exists (select 1 from public.vtg_calls where id = p_call_id and status = 'active')
     or not exists (select 1 from public.vtg_call_participants where call_id = p_call_id and user_id = me and left_at is null)
     or not exists (select 1 from public.vtg_call_participants where call_id = p_call_id and user_id = p_to_user and left_at is null) then
    raise exception 'Both parties must be in the active call' using errcode = '42501';
  end if;
  insert into public.vtg_call_signals(call_id, from_user, to_user, kind, payload) values (p_call_id, me, p_to_user, p_kind, p_payload);
end $$;

create function public.vtg_start_call(p_conversation_id uuid, p_kind text)
returns uuid language plpgsql security definer set search_path = 'public', 'private', 'pg_temp' as $$
declare me uuid := auth.uid(); new_call uuid; stale_call uuid; cap integer;
begin
  if me is null or not private.vtg_is_conversation_member(p_conversation_id) then
    raise exception 'Only conversation participants can start a call' using errcode = '42501';
  end if;
  if p_kind not in ('voice','video') then raise exception 'Call type must be voice or video'; end if;
  if not exists (select 1 from public.profiles where id = me and is_active = true) then
    raise exception 'Active VTG account required' using errcode = '42501';
  end if;
  select count(*) into cap from public.conversation_participants where conversation_id = p_conversation_id;
  if cap < 2 then raise exception 'A call needs at least two participants'; end if;
  if cap > 5 then raise exception 'Calls are limited to 5 participants'; end if;
  select id into stale_call from public.vtg_calls
   where conversation_id = p_conversation_id and status = 'active' and created_at < now() - interval '8 hours'
   order by created_at asc limit 1 for update;
  if stale_call is not null then
    update public.vtg_call_participants set left_at = coalesce(left_at, now()) where call_id = stale_call and left_at is null;
    update public.vtg_calls set status = 'ended', ended_at = now() where id = stale_call and status = 'active';
    delete from public.vtg_call_signals where call_id = stale_call;
  end if;
  select id into new_call from public.vtg_calls where conversation_id = p_conversation_id and status = 'active';
  if new_call is not null then return public.vtg_join_call(new_call); end if;
  insert into public.vtg_calls(conversation_id, kind, started_by) values (p_conversation_id, p_kind, me) returning id into new_call;
  insert into public.vtg_call_participants(call_id, user_id) values (new_call, me);
  return new_call;
exception when unique_violation then
  select id into new_call from public.vtg_calls where conversation_id = p_conversation_id and status = 'active';
  if new_call is null then raise; end if;
  return public.vtg_join_call(new_call);
end $$;

-- ---------------------------------------------------------------------------------------------
-- 9. Function privileges: signed-in users only
-- ---------------------------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'public' and p.proname in (
            'vtg_chat_contacts','vtg_open_conversation','vtg_list_conversations','vtg_get_messages','vtg_send_message',
            'vtg_send_voice_note','vtg_send_file_message','vtg_edit_message','vtg_delete_message','vtg_toggle_reaction',
            'vtg_toggle_star','vtg_toggle_pin','vtg_mark_delivered','vtg_mark_read','vtg_mark_played','vtg_message_info',
            'vtg_request_chat_clear','vtg_respond_chat_clear','vtg_cancel_chat_clear','vtg_pending_chat_clear',
            'vtg_claim_orphan_chat_files','vtg_end_call','vtg_join_call','vtg_leave_call','vtg_send_call_signal','vtg_start_call'))
       or (n.nspname = 'private' and p.proname in ('vtg_member_name','vtg_check_send','vtg_violation_result',
            'vtg_perform_chat_clear','vtg_message_after_insert'))
  loop
    execute format('revoke all on function %I.%I(%s) from public, anon', r.nspname, r.proname, r.args);
    if r.nspname = 'public' then
      execute format('grant execute on function %I.%I(%s) to authenticated', r.nspname, r.proname, r.args);
    end if;
  end loop;
end $$;
