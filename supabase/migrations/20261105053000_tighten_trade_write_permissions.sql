-- Tighten write permissions on trade-critical records.
-- Supplier listings must never self-assign verification or ownership.
revoke insert on table public.products from authenticated;
revoke insert (
  id, supplier_id, name, category, description, unit_price, currency,
  minimum_order_quantity, hs_code, lead_time_days, origin_country,
  image_urls, is_verified, is_active, created_at, updated_at, category_id
) on table public.products from authenticated;
grant insert (
  supplier_id, name, category, description, unit_price, currency,
  minimum_order_quantity, hs_code, lead_time_days, origin_country,
  image_urls, is_active, category_id
) on table public.products to authenticated;

revoke update on table public.products from authenticated;
revoke update (
  id, supplier_id, name, category, description, unit_price, currency,
  minimum_order_quantity, hs_code, lead_time_days, origin_country,
  image_urls, is_verified, is_active, created_at, updated_at, category_id
) on table public.products from authenticated;
grant update (
  name, category, description, unit_price, currency, minimum_order_quantity,
  hs_code, lead_time_days, origin_country, image_urls, is_active, updated_at, category_id
) on table public.products to authenticated;

drop policy if exists "supplier manages own products" on public.products;
create policy "active suppliers create own products" on public.products
for insert to authenticated
with check (
  supplier_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.is_active = true
  )
);

drop policy if exists "supplier updates own products" on public.products;
create policy "active suppliers update own products" on public.products
for update to authenticated
using (
  (supplier_id = (select auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.is_active = true
  )) or private.vtg_is_admin()
)
with check (
  (supplier_id = (select auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.is_active = true
  )) or private.vtg_is_admin()
);

drop policy if exists "supplier deletes own products" on public.products;
create policy "active suppliers delete own products" on public.products
for delete to authenticated
using (
  (supplier_id = (select auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.is_active = true
  )) or private.vtg_is_admin()
);

-- Orders may be created by active buyers only. Keep order status and identifiers
-- database-controlled on insert.
revoke insert on table public.trade_orders from authenticated;
revoke insert (
  id, reference, buyer_id, supplier_id, product_id, status, quantity,
  unit_price, currency, incoterm, origin_port, destination_port, notes,
  created_at, updated_at
) on table public.trade_orders from authenticated;
grant insert (
  buyer_id, supplier_id, product_id, quantity, unit_price, currency,
  incoterm, origin_port, destination_port, notes
) on table public.trade_orders to authenticated;

drop policy if exists "buyer creates own orders" on public.trade_orders;
create policy "active buyers create own orders" on public.trade_orders
for insert to authenticated
with check (
  buyer_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'buyer'::public.vtg_account_role
      and p.is_active = true
  )
);

-- Quote requests are created only through the validated atomic RPC. Suppliers
-- can update response fields, never ownership, buyer details, product or quantity.
revoke insert on table public.trade_quotes from authenticated;
revoke insert (
  id, order_id, buyer_id, supplier_id, product_id, quantity, unit_price,
  currency, incoterm, delivery_days, status, buyer_message,
  supplier_message, valid_until, created_at, updated_at
) on table public.trade_quotes from authenticated;
drop policy if exists "Buyers request quotes" on public.trade_quotes;

revoke update on table public.trade_quotes from authenticated;
revoke update (
  id, order_id, buyer_id, supplier_id, product_id, quantity, unit_price,
  currency, incoterm, delivery_days, status, buyer_message,
  supplier_message, valid_until, created_at, updated_at
) on table public.trade_quotes from authenticated;
grant update (
  unit_price, currency, incoterm, delivery_days, status,
  supplier_message, valid_until, updated_at
) on table public.trade_quotes to authenticated;

drop policy if exists "Suppliers respond to quotes" on public.trade_quotes;
create policy "active suppliers respond to quotes" on public.trade_quotes
for update to authenticated
using (
  supplier_id = (select auth.uid())
  and status = 'requested'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.is_active = true
  )
)
with check (
  supplier_id = (select auth.uid())
  and status = any (array['quoted'::text, 'declined'::text])
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.is_active = true
  )
);

-- Business applications may be submitted by active buyers, but only the
-- administrator review RPC can change review state or reviewer metadata.
revoke insert on table public.role_requests from authenticated;
revoke insert (
  id, user_id, requested_role, organization_name, country,
  registration_reference, message, status, reviewer_id,
  reviewer_notes, created_at, reviewed_at, application_data
) on table public.role_requests from authenticated;
grant insert (
  user_id, requested_role, organization_name, country,
  registration_reference, message, application_data
) on table public.role_requests to authenticated;

revoke update on table public.role_requests from authenticated;
revoke update (
  id, user_id, requested_role, organization_name, country,
  registration_reference, message, status, reviewer_id,
  reviewer_notes, created_at, reviewed_at, application_data
) on table public.role_requests from authenticated;

drop policy if exists "users submit role requests" on public.role_requests;
create policy "active buyers submit role requests" on public.role_requests
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'buyer'::public.vtg_account_role
      and p.is_active = true
  )
);