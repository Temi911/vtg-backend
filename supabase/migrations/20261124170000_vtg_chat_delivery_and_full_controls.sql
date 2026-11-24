-- VTG WhatsApp-style messaging completion: delivery, unread, replies, stars, pins and audio notes.
alter table public.messages
  add column if not exists reply_to_message_id uuid references public.messages(id) on delete set null;

create table if not exists public.vtg_message_delivery_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  primary key (message_id,user_id)
);
create index if not exists vtg_message_delivery_receipts_conversation_idx
  on public.vtg_message_delivery_receipts(conversation_id,user_id);

create table if not exists public.vtg_message_stars (
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id,user_id)
);
create index if not exists vtg_message_stars_user_idx on public.vtg_message_stars(user_id,created_at desc);

create table if not exists public.vtg_conversation_pins (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  pinned_by uuid not null references auth.users(id) on delete cascade,
  pinned_at timestamptz not null default now()
);

alter table public.vtg_message_delivery_receipts enable row level security;
alter table public.vtg_message_stars enable row level security;
alter table public.vtg_conversation_pins enable row level security;

drop policy if exists vtg_delivery_receipts_member_read on public.vtg_message_delivery_receipts;
create policy vtg_delivery_receipts_member_read on public.vtg_message_delivery_receipts
for select to authenticated using (private.vtg_is_conversation_member(conversation_id));
drop policy if exists vtg_message_stars_member_read on public.vtg_message_stars;
create policy vtg_message_stars_member_read on public.vtg_message_stars
for select to authenticated using (private.vtg_is_conversation_member(conversation_id) and user_id=auth.uid());
drop policy if exists vtg_conversation_pins_member_read on public.vtg_conversation_pins;
create policy vtg_conversation_pins_member_read on public.vtg_conversation_pins
for select to authenticated using (private.vtg_is_conversation_member(conversation_id));

revoke all on public.vtg_message_delivery_receipts, public.vtg_message_stars, public.vtg_conversation_pins from anon, authenticated;
grant select on public.vtg_message_delivery_receipts, public.vtg_message_stars, public.vtg_conversation_pins to authenticated;

create or replace function public.vtg_mark_message_delivered(p_message_id uuid)
returns boolean language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_uid uuid:=auth.uid(); v_cid uuid; v_sender uuid;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select conversation_id,sender_id into v_cid,v_sender from public.messages
  where id=p_message_id and deleted_at is null and hidden_at is null;
  if v_cid is null or not private.vtg_is_conversation_member(v_cid) then
    raise exception 'Message not found or access denied' using errcode='42501';
  end if;
  if v_sender=v_uid then return false; end if;
  insert into public.vtg_message_delivery_receipts(message_id,conversation_id,user_id)
  values(p_message_id,v_cid,v_uid) on conflict(message_id,user_id) do nothing;
  return true;
end $$;

create or replace function public.vtg_toggle_message_star(p_message_id uuid)
returns boolean language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_uid uuid:=auth.uid(); v_cid uuid; v_exists boolean;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select conversation_id into v_cid from public.messages
  where id=p_message_id and deleted_at is null and hidden_at is null;
  if v_cid is null or not private.vtg_is_conversation_member(v_cid) then
    raise exception 'Message not found or access denied' using errcode='42501';
  end if;
  select exists(select 1 from public.vtg_message_stars where message_id=p_message_id and user_id=v_uid) into v_exists;
  if v_exists then
    delete from public.vtg_message_stars where message_id=p_message_id and user_id=v_uid;
    return false;
  end if;
  insert into public.vtg_message_stars(message_id,conversation_id,user_id)
  values(p_message_id,v_cid,v_uid) on conflict(message_id,user_id) do nothing;
  return true;
end $$;

create or replace function public.vtg_pin_message(p_message_id uuid)
returns jsonb language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_uid uuid:=auth.uid(); v_cid uuid; v_current uuid;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select conversation_id into v_cid from public.messages
  where id=p_message_id and deleted_at is null and hidden_at is null;
  if v_cid is null or not private.vtg_is_conversation_member(v_cid) then
    raise exception 'Message not found or access denied' using errcode='42501';
  end if;
  select message_id into v_current from public.vtg_conversation_pins where conversation_id=v_cid;
  if v_current=p_message_id then
    delete from public.vtg_conversation_pins where conversation_id=v_cid;
    return jsonb_build_object('pinned',false);
  end if;
  insert into public.vtg_conversation_pins(conversation_id,message_id,pinned_by,pinned_at)
  values(v_cid,p_message_id,v_uid,now())
  on conflict(conversation_id) do update set message_id=excluded.message_id,pinned_by=excluded.pinned_by,pinned_at=excluded.pinned_at;
  return jsonb_build_object('pinned',true,'message_id',p_message_id);
end $$;

create or replace function public.vtg_unread_conversation_counts()
returns table(conversation_id uuid, unread_count bigint)
language sql stable security definer
set search_path=public,private,pg_temp
as $$
  select cp.conversation_id,
         count(m.id)::bigint as unread_count
  from public.conversation_participants cp
  left join public.messages m
    on m.conversation_id=cp.conversation_id
   and m.sender_id<>auth.uid()
   and m.deleted_at is null and m.hidden_at is null
   and not exists (
     select 1 from public.vtg_message_read_receipts rr
     where rr.message_id=m.id and rr.user_id=auth.uid()
   )
  where cp.user_id=auth.uid()
  group by cp.conversation_id
$$;

create or replace function public.vtg_send_message_with_reply(
  p_conversation_id uuid,p_body text,p_reply_to_message_id uuid
) returns jsonb language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare
  v_uid uuid:=auth.uid();
  v_message_id uuid;
  v_body text:=btrim(coalesce(p_body,''));
  v_category text;
  v_warnings integer;
begin
  if v_uid is null then raise exception 'Sign in required to send a message' using errcode='42501'; end if;
  if p_conversation_id is null then raise exception 'Choose a conversation before sending a message'; end if;
  if length(v_body)<1 or length(v_body)>4000 then raise exception 'Messages must contain between 1 and 4000 characters'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_uid and p.is_active=true) then
    raise exception 'An active VTG account is required to send messages' using errcode='42501';
  end if;
  if not private.vtg_is_conversation_member(p_conversation_id) then
    raise exception 'You are not a participant in this conversation' using errcode='42501';
  end if;
  if p_reply_to_message_id is not null and not exists(
    select 1 from public.messages m where m.id=p_reply_to_message_id
      and m.conversation_id=p_conversation_id and m.deleted_at is null and m.hidden_at is null
  ) then raise exception 'The message you are replying to is no longer available'; end if;
  v_category:=private.vtg_message_content_violation(v_body);
  if v_category is not null then
    insert into private.vtg_message_moderation_events(user_id,conversation_id,category)
    values(v_uid,p_conversation_id,v_category);
    select count(*)::integer into v_warnings from private.vtg_message_moderation_events
    where user_id=v_uid and created_at>=now()-interval '30 days';
    return jsonb_build_object('ok',false,'violation',true,'category',v_category,'warning_count',v_warnings,
      'message','This message was not sent. VTG does not allow sexually explicit, abusive, or threatening messages. Please rewrite it respectfully.');
  end if;
  insert into public.messages(conversation_id,sender_id,body,reply_to_message_id)
  values(p_conversation_id,v_uid,v_body,p_reply_to_message_id) returning id into v_message_id;
  return jsonb_build_object('ok',true,'message_id',v_message_id);
end $$;

revoke all on function public.vtg_mark_message_delivered(uuid) from public,anon;
revoke all on function public.vtg_toggle_message_star(uuid) from public,anon;
revoke all on function public.vtg_pin_message(uuid) from public,anon;
revoke all on function public.vtg_unread_conversation_counts() from public,anon;
revoke all on function public.vtg_send_message_with_reply(uuid,text,uuid) from public,anon;
grant execute on function public.vtg_mark_message_delivered(uuid) to authenticated;
grant execute on function public.vtg_toggle_message_star(uuid) to authenticated;
grant execute on function public.vtg_pin_message(uuid) to authenticated;
grant execute on function public.vtg_unread_conversation_counts() to authenticated;
grant execute on function public.vtg_send_message_with_reply(uuid,text,uuid) to authenticated;

alter table public.vtg_chat_attachments drop constraint if exists vtg_chat_attachments_attachment_type_check;
alter table public.vtg_chat_attachments add constraint vtg_chat_attachments_attachment_type_check
  check (attachment_type = any (array['document','image','video','audio','other']));

update storage.buckets
set allowed_mime_types = array[
  'application/pdf','text/plain','text/csv','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime',
  'audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/ogg'
]
where id='vtg-chat-attachments';

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='vtg_message_delivery_receipts') then
    alter publication supabase_realtime add table public.vtg_message_delivery_receipts;
  end if;
end $$;
