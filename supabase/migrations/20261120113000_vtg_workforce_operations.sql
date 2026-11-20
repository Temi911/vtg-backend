-- Shared, role-scoped operational work queues for all VTG workforce workspaces.
-- Browser clients never receive direct table write privileges; the Edge Function validates
-- the current Supabase identity and active workspace membership before every operation.

create table if not exists public.vtg_workforce_tasks (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  workspace_role text not null check (workspace_role in
    ('staff','manager','agent','logistics','compliance','support','finance','inspector','marketing')),
  title text not null check (char_length(trim(title)) between 3 and 180),
  description text not null default '' check (char_length(description) <= 4000),
  status text not null default 'open' check (status in ('open','in_progress','blocked','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  due_at timestamptz,
  entity_type text check (entity_type is null or entity_type in
    ('buyer_request','supplier_quote','trade_order','shipment','verification_document','support_case','inspection_request','product','payment_record')),
  entity_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vtg_workforce_tasks_role_status_idx
  on public.vtg_workforce_tasks(workspace_role,status,priority,due_at);
create index if not exists vtg_workforce_tasks_assignee_idx
  on public.vtg_workforce_tasks(assigned_to,status,due_at);
create index if not exists vtg_workforce_tasks_created_idx
  on public.vtg_workforce_tasks(created_at desc);

create table if not exists public.vtg_workforce_handoffs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.vtg_workforce_tasks(id) on delete restrict,
  from_workspace_role text not null check (from_workspace_role in
    ('staff','manager','agent','logistics','compliance','support','finance','inspector','marketing')),
  to_workspace_role text not null check (to_workspace_role in
    ('staff','manager','agent','logistics','compliance','support','finance','inspector','marketing')),
  initiated_by uuid not null references auth.users(id),
  proposed_assignee uuid references auth.users(id),
  accepted_by uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (from_workspace_role <> to_workspace_role)
);
create index if not exists vtg_workforce_handoffs_task_idx on public.vtg_workforce_handoffs(task_id,created_at desc);
create index if not exists vtg_workforce_handoffs_inbox_idx on public.vtg_workforce_handoffs(to_workspace_role,status,created_at desc);

create table if not exists public.vtg_workforce_activity (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  task_id uuid references public.vtg_workforce_tasks(id) on delete restrict,
  handoff_id uuid references public.vtg_workforce_handoffs(id) on delete restrict,
  event_type text not null check (event_type in
    ('task_created','task_updated','task_completed','handoff_created','handoff_accepted','handoff_rejected')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (task_id is not null or handoff_id is not null)
);
create index if not exists vtg_workforce_activity_created_idx on public.vtg_workforce_activity(created_at desc);
create index if not exists vtg_workforce_activity_task_idx on public.vtg_workforce_activity(task_id,created_at desc);

alter table public.vtg_workforce_tasks enable row level security;
alter table public.vtg_workforce_handoffs enable row level security;
alter table public.vtg_workforce_activity enable row level security;

revoke all on public.vtg_workforce_tasks, public.vtg_workforce_handoffs, public.vtg_workforce_activity from anon, authenticated;
grant all on public.vtg_workforce_tasks, public.vtg_workforce_handoffs, public.vtg_workforce_activity to service_role;

create or replace function private.vtg_workforce_activity_append_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Workforce activity history is append-only' using errcode = '42501';
end;
$$;
drop trigger if exists vtg_workforce_activity_append_only on public.vtg_workforce_activity;
create trigger vtg_workforce_activity_append_only
before update or delete on public.vtg_workforce_activity
for each row execute function private.vtg_workforce_activity_append_only();

create or replace function private.vtg_workforce_task_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists vtg_workforce_task_updated_at on public.vtg_workforce_tasks;
create trigger vtg_workforce_task_updated_at
before update on public.vtg_workforce_tasks
for each row execute function private.vtg_workforce_task_updated_at();

comment on table public.vtg_workforce_tasks is
  'Internal workforce task queue. Access only through workforce-operations Edge Function; entity references do not duplicate customer or financial data.';
comment on table public.vtg_workforce_handoffs is
  'Internal role-to-role task handoffs with explicit acceptance and immutable activity history.';
comment on table public.vtg_workforce_activity is
  'Append-only workforce activity events. Read and write through the authenticated workforce-operations Edge Function.';
