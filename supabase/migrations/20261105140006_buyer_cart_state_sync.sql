create table if not exists public.buyer_cart_states (
  buyer_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint buyer_cart_states_items_array check (jsonb_typeof(items) = 'array')
);

alter table public.buyer_cart_states enable row level security;

grant select, insert, update on public.buyer_cart_states to authenticated;

create policy buyer_cart_states_select_own
  on public.buyer_cart_states for select to authenticated
  using (buyer_id = (select auth.uid()));

create policy buyer_cart_states_insert_own
  on public.buyer_cart_states for insert to authenticated
  with check (buyer_id = (select auth.uid()));

create policy buyer_cart_states_update_own
  on public.buyer_cart_states for update to authenticated
  using (buyer_id = (select auth.uid()))
  with check (buyer_id = (select auth.uid()));
