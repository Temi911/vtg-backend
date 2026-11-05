-- Buyer-owned supplier contact book. Contacts are private to the buyer account and are not VTG-verified.
create table if not exists public.buyer_saved_suppliers (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null check (char_length(btrim(company_name)) between 1 and 140),
  country text not null check (country in ('China', 'South Korea', 'Other')),
  contact_person text check (contact_person is null or char_length(contact_person) <= 100),
  email text check (email is null or char_length(email) <= 180),
  products text check (products is null or char_length(products) <= 180),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists buyer_saved_suppliers_buyer_created_idx
  on public.buyer_saved_suppliers (buyer_id, created_at desc);
alter table public.buyer_saved_suppliers enable row level security;
grant select, insert, delete on public.buyer_saved_suppliers to authenticated;
drop policy if exists "Buyers can view their saved suppliers" on public.buyer_saved_suppliers;
create policy "Buyers can view their saved suppliers"
  on public.buyer_saved_suppliers for select to authenticated
  using (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'buyer' and p.is_active = true
    )
  );
drop policy if exists "Active buyers can save supplier contacts" on public.buyer_saved_suppliers;
create policy "Active buyers can save supplier contacts"
  on public.buyer_saved_suppliers for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'buyer' and p.is_active = true
    )
  );
drop policy if exists "Buyers can delete their saved suppliers" on public.buyer_saved_suppliers;
create policy "Buyers can delete their saved suppliers"
  on public.buyer_saved_suppliers for delete to authenticated
  using (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'buyer' and p.is_active = true
    )
  );
