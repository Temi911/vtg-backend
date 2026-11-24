-- Keep a call owned by its organiser. If that organiser leaves or closes the page,
-- end the shared call for everyone instead of leaving an unmanageable active call.
create or replace function public.vtg_leave_call(p_call_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  me uuid := auth.uid();
  v_call public.vtg_calls%rowtype;
begin
  if me is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  select * into v_call
  from public.vtg_calls
  where id = p_call_id
  for update;

  if not found then
    raise exception 'Call not found';
  end if;

  -- Repeated leave requests after an end event are harmless (e.g. pagehide races).
  if v_call.status = 'ended' then
    return;
  end if;

  if not exists (
    select 1 from public.vtg_call_participants
    where call_id = p_call_id and user_id = me and left_at is null
  ) then
    raise exception 'Only an active call participant can leave this call'
      using errcode = '42501';
  end if;

  if v_call.started_by = me then
    update public.vtg_calls
    set status = 'ended', ended_at = now()
    where id = p_call_id and status = 'active';

    update public.vtg_call_participants
    set left_at = coalesce(left_at, now())
    where call_id = p_call_id and left_at is null;

    delete from public.vtg_call_signals where call_id = p_call_id;
    return;
  end if;

  update public.vtg_call_participants
  set left_at = now()
  where call_id = p_call_id and user_id = me and left_at is null;

  if not exists (
    select 1 from public.vtg_call_participants
    where call_id = p_call_id and left_at is null
  ) then
    update public.vtg_calls
    set status = 'ended', ended_at = now()
    where id = p_call_id and status = 'active';
    delete from public.vtg_call_signals where call_id = p_call_id;
  end if;
end;
$function$;

-- A call left active by a browser crash or an old client cannot block a fresh call
-- indefinitely. Eight hours is deliberately generous for legitimate long calls.
create or replace function public.vtg_start_call(p_conversation_id uuid, p_kind text)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  me uuid := auth.uid();
  new_call uuid;
  stale_call uuid;
  cap integer;
begin
  if me is null or not private.vtg_is_conversation_member(p_conversation_id) then
    raise exception 'Only conversation participants can start a call' using errcode = '42501';
  end if;
  if p_kind not in ('voice','video') then
    raise exception 'Call type must be voice or video';
  end if;
  if not exists (select 1 from public.profiles where id = me and is_active = true) then
    raise exception 'Active VTG account required' using errcode = '42501';
  end if;

  select count(*) into cap
  from public.conversation_participants
  where conversation_id = p_conversation_id;
  if cap < 2 then raise exception 'A call needs at least two participants'; end if;
  if cap > 5 then raise exception 'Calls are limited to 5 participants'; end if;

  -- Retire an abandoned call before trying to join it.
  select id into stale_call
  from public.vtg_calls
  where conversation_id = p_conversation_id
    and status = 'active'
    and created_at < now() - interval '8 hours'
  order by created_at asc
  limit 1
  for update;

  if stale_call is not null then
    update public.vtg_call_participants
    set left_at = coalesce(left_at, now())
    where call_id = stale_call and left_at is null;

    update public.vtg_calls
    set status = 'ended', ended_at = now()
    where id = stale_call and status = 'active';

    delete from public.vtg_call_signals where call_id = stale_call;
  end if;

  select id into new_call
  from public.vtg_calls
  where conversation_id = p_conversation_id and status = 'active';

  if new_call is not null then
    return public.vtg_join_call(new_call);
  end if;

  insert into public.vtg_calls(conversation_id, kind, started_by)
  values (p_conversation_id, p_kind, me)
  returning id into new_call;

  insert into public.vtg_call_participants(call_id, user_id)
  values (new_call, me);
  return new_call;
exception when unique_violation then
  select id into new_call
  from public.vtg_calls
  where conversation_id = p_conversation_id and status = 'active';
  if new_call is null then raise; end if;
  return public.vtg_join_call(new_call);
end;
$$;

revoke all on function public.vtg_leave_call(uuid) from public, anon;
grant execute on function public.vtg_leave_call(uuid) to authenticated;
revoke all on function public.vtg_start_call(uuid, text) from public, anon;
grant execute on function public.vtg_start_call(uuid, text) to authenticated;
