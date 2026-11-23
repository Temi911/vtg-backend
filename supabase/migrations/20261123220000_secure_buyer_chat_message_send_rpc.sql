-- Secure participant-checked message sending through one authenticated RPC.
-- The caller's identity always comes from auth.uid(); sender_id is never client supplied.
create or replace function public.vtg_send_message(
  p_conversation_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_message_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_user_id is null then
    raise exception 'Sign in required to send a message' using errcode = '42501';
  end if;

  if p_conversation_id is null then
    raise exception 'Choose a conversation before sending a message';
  end if;

  if length(v_body) < 1 or length(v_body) > 4000 then
    raise exception 'Messages must contain between 1 and 4000 characters';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.is_active = true
  ) then
    raise exception 'An active VTG account is required to send messages' using errcode = '42501';
  end if;

  if not private.vtg_is_conversation_member(p_conversation_id) then
    raise exception 'You are not a participant in this conversation' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_user_id, v_body)
  returning id into v_message_id;

  return v_message_id;
end;
$function$;

revoke all on function public.vtg_send_message(uuid, text) from public;
grant execute on function public.vtg_send_message(uuid, text) to authenticated;
