-- Repair message deletion and make unanimous chat clearing reliable.
-- Deleted messages retain a non-empty tombstone body to satisfy messages_body_check.
create or replace function public.vtg_delete_message(p_message_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_msg public.messages%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into v_msg from public.messages where id = p_message_id for update;
  if not found or v_msg.sender_id <> v_uid or not private.vtg_is_conversation_member(v_msg.conversation_id) then
    raise exception 'You can only delete your own message' using errcode = '42501';
  end if;
  if v_msg.deleted_at is not null then
    return pg_catalog.jsonb_build_object('ok', true, 'message_id', p_message_id, 'already_deleted', true);
  end if;
  update public.messages
  set body = 'This message was deleted', deleted_at = pg_catalog.now(), deleted_by = v_uid
  where id = p_message_id;
  return pg_catalog.jsonb_build_object('ok', true, 'message_id', p_message_id);
end;
$$;

create or replace function public.vtg_request_chat_clear(p_conversation_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_req uuid; v_total integer;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  perform 1 from public.conversations where id = p_conversation_id for update;
  if not found or not private.vtg_is_conversation_member(p_conversation_id) then
    raise exception 'You are not a participant in this chat' using errcode = '42501';
  end if;
  if exists (select 1 from public.vtg_chat_clear_requests where conversation_id = p_conversation_id and status = 'pending') then
    return pg_catalog.jsonb_build_object('ok', false, 'message', 'A clear request is already pending.');
  end if;
  insert into public.vtg_chat_clear_requests(conversation_id, requested_by)
  values (p_conversation_id, v_uid) returning id into v_req;
  insert into public.vtg_chat_clear_responses(request_id, user_id, approved)
  values (v_req, v_uid, true)
  on conflict (request_id, user_id) do update set approved = true, responded_at = pg_catalog.now();
  insert into public.vtg_notifications(user_id, title, body, notification_type, entity_type, entity_id)
  select distinct cp.user_id, 'Chat clear request',
    'A participant wants to clear this chat. Open VTG messages to agree or decline.',
    'chat_clear_request', 'conversation', p_conversation_id
  from public.conversation_participants cp
  where cp.conversation_id = p_conversation_id and cp.user_id <> v_uid;
  select count(distinct cp.user_id)::integer into v_total
  from public.conversation_participants cp where cp.conversation_id = p_conversation_id;
  if v_total <= 1 then
    update public.messages set hidden_at = pg_catalog.now()
    where conversation_id = p_conversation_id and hidden_at is null;
    update public.vtg_chat_clear_requests set status = 'approved', resolved_at = pg_catalog.now() where id = v_req;
    return pg_catalog.jsonb_build_object('ok', true, 'cleared', true, 'message', 'Chat cleared.');
  end if;
  return pg_catalog.jsonb_build_object('ok', true, 'request_id', v_req,
    'message', 'Request sent. All other participants have been notified.');
end;
$$;

create or replace function public.vtg_respond_chat_clear(p_request_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.vtg_chat_clear_requests%rowtype;
  v_total integer;
  v_missing integer;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into v_req from public.vtg_chat_clear_requests where id = p_request_id for update;
  if not found or not private.vtg_is_conversation_member(v_req.conversation_id) then
    raise exception 'Clear request not found for this chat' using errcode = '42501';
  end if;
  if v_req.status <> 'pending' then
    return pg_catalog.jsonb_build_object('ok', false, 'cleared', false, 'message', 'This request is already resolved.');
  end if;
  insert into public.vtg_chat_clear_responses(request_id, user_id, approved)
  values (p_request_id, v_uid, p_approve)
  on conflict (request_id, user_id) do update
    set approved = excluded.approved, responded_at = pg_catalog.now();
  if not p_approve then
    update public.vtg_chat_clear_requests set status = 'rejected', resolved_at = pg_catalog.now() where id = p_request_id;
    insert into public.vtg_notifications(user_id, title, body, notification_type, entity_type, entity_id)
    select distinct cp.user_id, 'Chat clear declined',
      'A participant declined. Your chat history remains unchanged.',
      'chat_clear_result', 'conversation', v_req.conversation_id
    from public.conversation_participants cp where cp.conversation_id = v_req.conversation_id;
    return pg_catalog.jsonb_build_object('ok', true, 'cleared', false,
      'message', 'You declined. Chat history remains unchanged.');
  end if;
  select count(distinct cp.user_id)::integer into v_total
  from public.conversation_participants cp where cp.conversation_id = v_req.conversation_id;
  select count(*)::integer into v_missing
  from (
    select distinct cp.user_id from public.conversation_participants cp
    where cp.conversation_id = v_req.conversation_id
  ) participants
  where not exists (
    select 1 from public.vtg_chat_clear_responses r
    where r.request_id = p_request_id and r.user_id = participants.user_id and r.approved = true
  );
  if v_total > 0 and v_missing = 0 then
    update public.messages set hidden_at = pg_catalog.now()
    where conversation_id = v_req.conversation_id and hidden_at is null;
    update public.vtg_chat_clear_requests set status = 'approved', resolved_at = pg_catalog.now() where id = p_request_id;
    insert into public.vtg_notifications(user_id, title, body, notification_type, entity_type, entity_id)
    select distinct cp.user_id, 'Chat cleared',
      'Everyone agreed. Chat history is now cleared for all participants.',
      'chat_clear_result', 'conversation', v_req.conversation_id
    from public.conversation_participants cp where cp.conversation_id = v_req.conversation_id;
    return pg_catalog.jsonb_build_object('ok', true, 'cleared', true,
      'message', 'Everyone agreed. Chat cleared for all participants.');
  end if;
  insert into public.vtg_notifications(user_id, title, body, notification_type, entity_type, entity_id)
  select v_req.requested_by, 'Chat clear approval',
    'A participant agreed. Waiting for everyone else.',
    'chat_clear_result', 'conversation', v_req.conversation_id
  where v_req.requested_by <> v_uid;
  return pg_catalog.jsonb_build_object('ok', true, 'cleared', false,
    'message', 'Approval recorded. Waiting for everyone else.');
end;
$$;

revoke all on function public.vtg_delete_message(uuid) from public, anon;
revoke all on function public.vtg_request_chat_clear(uuid) from public, anon;
revoke all on function public.vtg_respond_chat_clear(uuid, boolean) from public, anon;
grant execute on function public.vtg_delete_message(uuid) to authenticated;
grant execute on function public.vtg_request_chat_clear(uuid) to authenticated;
grant execute on function public.vtg_respond_chat_clear(uuid, boolean) to authenticated;
