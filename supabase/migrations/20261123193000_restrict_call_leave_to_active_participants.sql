create or replace function public.vtg_leave_call(p_call_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  me uuid := auth.uid();
begin
  if me is null or not exists (
    select 1
    from public.vtg_call_participants
    where call_id = p_call_id
      and user_id = me
      and left_at is null
  ) then
    raise exception 'Only an active call participant can leave this call'
      using errcode = '42501';
  end if;

  update public.vtg_call_participants
  set left_at = now()
  where call_id = p_call_id
    and user_id = me
    and left_at is null;

  if not exists (
    select 1
    from public.vtg_call_participants
    where call_id = p_call_id
      and left_at is null
  ) then
    update public.vtg_calls
    set status = 'ended', ended_at = now()
    where id = p_call_id and status = 'active';

    delete from public.vtg_call_signals
    where call_id = p_call_id;
  end if;
end;
$function$;
