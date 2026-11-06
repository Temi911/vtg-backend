create or replace function public.vtg_conversation_sender_roles(p_conversation_id uuid)
returns table(user_id uuid, role text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.role::text
  from public.profiles p
  where exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.messages m
    where m.conversation_id = p_conversation_id
      and m.sender_id = p.id
  );
$$;

revoke all on function public.vtg_conversation_sender_roles(uuid) from public;
grant execute on function public.vtg_conversation_sender_roles(uuid) to authenticated;