begin;

-- Remove the legacy policy that queries conversation_participants directly.
-- The participant table's own SELECT policy checks conversations, which creates
-- a recursive RLS evaluation cycle.
drop policy if exists "conversation participants read" on public.conversations;

-- Membership is checked in a narrowly scoped SECURITY DEFINER helper so the
-- policy can inspect participant rows without recursively invoking their RLS.
create or replace function private.vtg_is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = (select auth.uid())
  );
$$;

revoke all on function private.vtg_is_conversation_member(uuid) from public, anon;
grant execute on function private.vtg_is_conversation_member(uuid) to authenticated;

-- Preserve access for conversation creators and active VTG administrators,
-- while allowing actual participants to read their conversations.
drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations"
on public.conversations
for select
to authenticated
using (
  created_by = (select auth.uid())
  or private.vtg_is_admin()
  or private.vtg_is_conversation_member(id)
);

commit;
