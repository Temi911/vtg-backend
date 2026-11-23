-- The person who started a call can end it for every participant.
create or replace function public.vtg_end_call(p_call_id uuid)
returns void
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare me uuid := auth.uid(); c public.vtg_calls%rowtype;
begin
  select * into c from public.vtg_calls where id = p_call_id for update;
  if not found then raise exception 'Call not found'; end if;
  if me is null or c.started_by <> me then
    raise exception 'Only the person who started the call can end it for everyone' using errcode = '42501';
  end if;
  update public.vtg_call_participants set left_at = now() where call_id = p_call_id and left_at is null;
  update public.vtg_calls set status = 'ended', ended_at = now() where id = p_call_id and status = 'active';
  delete from public.vtg_call_signals where call_id = p_call_id;
end;
$$;
revoke all on function public.vtg_end_call(uuid) from public, anon;
grant execute on function public.vtg_end_call(uuid) to authenticated;
