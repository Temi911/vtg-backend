-- VTG messaging + voice/video calls.
-- Conversations are private to their participants. Calls are limited to 5 participants.
-- Call media is peer-to-peer (WebRTC); this schema only carries call state and signalling.
-- NOTE: policies on conversations/messages are created idempotently and are participant-only.
-- Review against any pre-existing production policies before applying.

alter table public.conversations
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists title text,
  add column if not exists is_group boolean not null default false;

-- ---------------------------------------------------------------- helpers
create or replace function private.vtg_is_conversation_member(p_conversation_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = (select auth.uid())
  );
$$;
revoke all on function private.vtg_is_conversation_member(uuid) from public, anon;
grant execute on function private.vtg_is_conversation_member(uuid) to authenticated;

-- Two accounts may chat only when a trade record links them (order, or an LC naming the bank).
create or replace function private.vtg_trade_linked(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p_a is not null and p_b is not null and p_a <> p_b and (
    exists (select 1 from public.trade_orders o
            where (o.buyer_id = p_a and o.supplier_id = p_b) or (o.buyer_id = p_b and o.supplier_id = p_a))
    or exists (select 1 from public.letters_of_credit lc
            where (lc.bank_id = p_a and p_b in (lc.buyer_id, lc.supplier_id))
               or (lc.bank_id = p_b and p_a in (lc.buyer_id, lc.supplier_id)))
  );
$$;
revoke all on function private.vtg_trade_linked(uuid, uuid) from public, anon;
grant execute on function private.vtg_trade_linked(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- RLS: conversations / messages
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

grant select on public.conversations to authenticated;
grant select on public.conversation_participants to authenticated;
grant select, insert on public.messages to authenticated;

drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations" on public.conversations for select to authenticated
  using (private.vtg_is_conversation_member(id));

drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages for select to authenticated
  using (private.vtg_is_conversation_member(conversation_id));

drop policy if exists "members send own messages" on public.messages;
create policy "members send own messages" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.vtg_is_conversation_member(conversation_id)
    and length(body) between 1 and 4000
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true)
  );

-- ---------------------------------------------------------------- RPC: contacts, members, open chat
create or replace function public.vtg_chat_contacts()
returns table(user_id uuid, display_name text, role text)
language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select p.id,
         coalesce(nullif(sp.company_name,''), nullif(bp.bank_name,''), nullif(byp.company_name,''), nullif(p.full_name,''), 'VTG member'),
         p.role::text
  from public.profiles p
  left join public.supplier_profiles sp on sp.user_id = p.id
  left join public.bank_profiles bp on bp.user_id = p.id
  left join public.buyer_profiles byp on byp.user_id = p.id
  where p.is_active = true
    and p.account_environment = 'trade'
    and private.vtg_trade_linked((select auth.uid()), p.id)
  order by 2;
$$;
revoke all on function public.vtg_chat_contacts() from public, anon;
grant execute on function public.vtg_chat_contacts() to authenticated;

create or replace function public.vtg_conversation_members(p_conversation_id uuid)
returns table(user_id uuid, display_name text, role text)
language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select p.id,
         coalesce(nullif(sp.company_name,''), nullif(bp.bank_name,''), nullif(byp.company_name,''), nullif(p.full_name,''), 'VTG member'),
         p.role::text
  from public.conversation_participants cp
  join public.profiles p on p.id = cp.user_id
  left join public.supplier_profiles sp on sp.user_id = p.id
  left join public.bank_profiles bp on bp.user_id = p.id
  left join public.buyer_profiles byp on byp.user_id = p.id
  where cp.conversation_id = p_conversation_id
    and private.vtg_is_conversation_member(p_conversation_id);
$$;
revoke all on function public.vtg_conversation_members(uuid) from public, anon;
grant execute on function public.vtg_conversation_members(uuid) to authenticated;

-- Open (or create) a conversation with 1-4 trade-linked partners (5 people max, matching call capacity).
create or replace function public.vtg_open_conversation(p_partner_ids uuid[], p_title text default null)
returns uuid
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare
  me uuid := auth.uid();
  partners uuid[];
  existing uuid;
  new_id uuid;
  pid uuid;
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

  -- reuse an existing conversation with exactly this set of people
  select c.id into existing
  from public.conversations c
  where (select array_agg(cp.user_id order by cp.user_id) from public.conversation_participants cp where cp.conversation_id = c.id)
        = (select array_agg(u order by u) from unnest(partners || me) u)
  limit 1;
  if existing is not null then return existing; end if;

  insert into public.conversations(created_by, title, is_group)
  values (me, nullif(left(trim(coalesce(p_title,'')),80),''), cardinality(partners) > 1)
  returning id into new_id;
  insert into public.conversation_participants(conversation_id, user_id)
  select new_id, u from unnest(partners || me) u;
  return new_id;
end;
$$;
revoke all on function public.vtg_open_conversation(uuid[], text) from public, anon;
grant execute on function public.vtg_open_conversation(uuid[], text) to authenticated;

-- ---------------------------------------------------------------- calls
create table if not exists public.vtg_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  kind text not null check (kind in ('voice','video')),
  started_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','ended')),
  max_participants integer not null default 5 check (max_participants between 2 and 5),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists vtg_calls_conversation_idx on public.vtg_calls(conversation_id, created_at desc);
-- at most one live call per conversation
create unique index if not exists vtg_calls_one_active_per_conversation
  on public.vtg_calls(conversation_id) where status = 'active';

create table if not exists public.vtg_call_participants (
  call_id uuid not null references public.vtg_calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (call_id, user_id)
);

create table if not exists public.vtg_call_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.vtg_calls(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offer','answer','candidate')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists vtg_call_signals_to_idx on public.vtg_call_signals(to_user, call_id, id);

alter table public.vtg_calls enable row level security;
alter table public.vtg_call_participants enable row level security;
alter table public.vtg_call_signals enable row level security;
revoke all on public.vtg_calls, public.vtg_call_participants, public.vtg_call_signals from anon, authenticated;
grant select on public.vtg_calls, public.vtg_call_participants to authenticated;
grant select on public.vtg_call_signals to authenticated;

drop policy if exists "members read calls" on public.vtg_calls;
create policy "members read calls" on public.vtg_calls for select to authenticated
  using (private.vtg_is_conversation_member(conversation_id));

drop policy if exists "members read call participants" on public.vtg_call_participants;
create policy "members read call participants" on public.vtg_call_participants for select to authenticated
  using (exists (select 1 from public.vtg_calls c where c.id = call_id and private.vtg_is_conversation_member(c.conversation_id)));

drop policy if exists "recipient reads own call signals" on public.vtg_call_signals;
create policy "recipient reads own call signals" on public.vtg_call_signals for select to authenticated
  using (to_user = (select auth.uid()));

create or replace function public.vtg_start_call(p_conversation_id uuid, p_kind text)
returns uuid
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare me uuid := auth.uid(); new_call uuid; cap integer;
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
  -- join the existing live call instead of creating a second one
  select id into new_call from public.vtg_calls where conversation_id = p_conversation_id and status = 'active';
  if new_call is not null then return public.vtg_join_call(new_call); end if;
  insert into public.vtg_calls(conversation_id, kind, started_by) values (p_conversation_id, p_kind, me) returning id into new_call;
  insert into public.vtg_call_participants(call_id, user_id) values (new_call, me);
  return new_call;
exception when unique_violation then
  select id into new_call from public.vtg_calls where conversation_id = p_conversation_id and status = 'active';
  return public.vtg_join_call(new_call);
end;
$$;

create or replace function public.vtg_join_call(p_call_id uuid)
returns uuid
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare me uuid := auth.uid(); c public.vtg_calls%rowtype; live integer;
begin
  select * into c from public.vtg_calls where id = p_call_id for update;
  if not found or c.status <> 'active' then raise exception 'This call has ended'; end if;
  if me is null or not private.vtg_is_conversation_member(c.conversation_id) then
    raise exception 'Only conversation participants can join this call' using errcode = '42501';
  end if;
  if exists (select 1 from public.vtg_call_participants where call_id = p_call_id and user_id = me and left_at is null) then
    return p_call_id;
  end if;
  select count(*) into live from public.vtg_call_participants where call_id = p_call_id and left_at is null;
  if live >= c.max_participants then raise exception 'This call is full (maximum % participants)', c.max_participants; end if;
  insert into public.vtg_call_participants(call_id, user_id) values (p_call_id, me)
  on conflict (call_id, user_id) do update set left_at = null, joined_at = now();
  return p_call_id;
end;
$$;

create or replace function public.vtg_leave_call(p_call_id uuid)
returns void
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare me uuid := auth.uid();
begin
  update public.vtg_call_participants set left_at = now()
  where call_id = p_call_id and user_id = me and left_at is null;
  if not exists (select 1 from public.vtg_call_participants where call_id = p_call_id and left_at is null) then
    update public.vtg_calls set status = 'ended', ended_at = now() where id = p_call_id and status = 'active';
    delete from public.vtg_call_signals where call_id = p_call_id;
  end if;
end;
$$;

create or replace function public.vtg_send_call_signal(p_call_id uuid, p_to_user uuid, p_kind text, p_payload jsonb)
returns void
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
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
  insert into public.vtg_call_signals(call_id, from_user, to_user, kind, payload)
  values (p_call_id, me, p_to_user, p_kind, p_payload);
end;
$$;

revoke all on function public.vtg_start_call(uuid, text), public.vtg_join_call(uuid), public.vtg_leave_call(uuid),
  public.vtg_send_call_signal(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.vtg_start_call(uuid, text), public.vtg_join_call(uuid), public.vtg_leave_call(uuid),
  public.vtg_send_call_signal(uuid, uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------- realtime
do $$
declare t text;
begin
  foreach t in array array['messages','vtg_calls','vtg_call_participants','vtg_call_signals'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
