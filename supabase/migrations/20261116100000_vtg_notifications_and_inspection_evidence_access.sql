-- Buyer dashboard backend gaps found on a fresh (staging) database:
--  1. public.vtg_notifications is used by the dashboard bell, vtg-notifications, vtg-email and the AI assistant,
--     but no migration created it.
--  2. public.vtg_inspection_evidence had row-level security on but no policy or grant, so a buyer could not
--     read the evidence of their own inspections.
-- Idempotent: safe to run on a database that already has these objects (create ... if not exists; policies guarded).

create table if not exists public.vtg_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  notification_type text not null default 'general',
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists vtg_notifications_user_created_idx on public.vtg_notifications (user_id, created_at desc);
alter table public.vtg_notifications enable row level security;

do $$ begin
  create policy "own notifications read" on public.vtg_notifications for select to authenticated
    using (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own notifications mark read" on public.vtg_notifications for update to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;

revoke all on public.vtg_notifications from anon, authenticated;
grant select on public.vtg_notifications to authenticated;
grant update (read_at) on public.vtg_notifications to authenticated;   -- users can only mark their own as read
grant all on public.vtg_notifications to service_role;                 -- edge functions create notifications

-- Inspection evidence: read-only for the buyer who requested the inspection and the assigned inspector.
-- Uploads happen through the vtg-inspection-workflow edge function (service role).
do $$ begin
  create policy "inspection evidence read" on public.vtg_inspection_evidence for select to authenticated
    using (exists (
      select 1 from public.vtg_inspection_requests r
      where r.id = vtg_inspection_evidence.inspection_id
        and (r.requested_by = (select auth.uid()) or r.inspector_id = (select auth.uid()))
    ) or private.vtg_is_admin());
exception when duplicate_object then null; end $$;
revoke all on public.vtg_inspection_evidence from anon;
grant select on public.vtg_inspection_evidence to authenticated;
grant all on public.vtg_inspection_evidence to service_role;
