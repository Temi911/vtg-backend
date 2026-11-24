-- Reminders created by the signed-in user's VTG AI (or the user). Due reminders are turned into
-- notifications by vtg_fire_due_reminders(), which the dashboards call while open.
create table if not exists public.vtg_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  note text check (note is null or char_length(note) <= 500),
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','fired','dismissed','cancelled')),
  source text not null default 'ai' check (source in ('ai','user')),
  created_at timestamptz not null default now(),
  fired_at timestamptz
);
create index if not exists vtg_reminders_user_status_due_idx on public.vtg_reminders(user_id, status, remind_at);
alter table public.vtg_reminders enable row level security;
create policy "own reminders read" on public.vtg_reminders for select to authenticated using (user_id = (select auth.uid()));
create policy "own reminders create" on public.vtg_reminders for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy "own reminders update" on public.vtg_reminders for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and status in ('pending','dismissed','cancelled','fired'));
grant select, insert, update on public.vtg_reminders to authenticated;

create or replace function public.vtg_fire_due_reminders()
returns table(id uuid, title text, note text, remind_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  return query
  with due as (
    update public.vtg_reminders r set status = 'fired', fired_at = now()
    where r.user_id = v_uid and r.status = 'pending' and r.remind_at <= now()
    returning r.id, r.title, r.note, r.remind_at
  ), notes as (
    insert into public.vtg_notifications(user_id, title, body, notification_type, entity_type, entity_id)
    select v_uid, 'Reminder: ' || d.title, coalesce(nullif(d.note, ''), d.title), 'reminder', 'reminder', d.id from due d
    returning 1
  )
  select d.id, d.title, d.note, d.remind_at from due d order by d.remind_at;
end $$;
revoke all on function public.vtg_fire_due_reminders() from public, anon;
grant execute on function public.vtg_fire_due_reminders() to authenticated;
