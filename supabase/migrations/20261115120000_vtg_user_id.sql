-- Every account gets a permanent, human-friendly VTG user ID (e.g. VTG-100001).
-- Assigned automatically on sign-up, backfilled for existing users in sign-up order, never changes.
create sequence if not exists public.vtg_user_id_seq start 100001;

alter table public.profiles add column if not exists vtg_user_id text;

do $$
declare r record;
begin
  for r in select id from public.profiles where vtg_user_id is null order by created_at, id loop
    update public.profiles
       set vtg_user_id = 'VTG-' || lpad(nextval('public.vtg_user_id_seq')::text, 6, '0')
     where id = r.id;
  end loop;
end $$;

alter table public.profiles
  alter column vtg_user_id set default ('VTG-' || lpad(nextval('public.vtg_user_id_seq')::text, 6, '0')),
  alter column vtg_user_id set not null;

create unique index if not exists profiles_vtg_user_id_key on public.profiles (vtg_user_id);

-- The ID is permanent: updates can never change it.
create or replace function public.vtg_keep_user_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.vtg_user_id is not null then new.vtg_user_id := old.vtg_user_id; end if;
  return new;
end $$;

drop trigger if exists vtg_keep_user_id_trg on public.profiles;
create trigger vtg_keep_user_id_trg before update on public.profiles
  for each row execute function public.vtg_keep_user_id();

-- Sign-up runs as the auth/service roles; they need to draw from the sequence.
grant usage on sequence public.vtg_user_id_seq to service_role, supabase_auth_admin;
revoke all on sequence public.vtg_user_id_seq from anon, authenticated;
