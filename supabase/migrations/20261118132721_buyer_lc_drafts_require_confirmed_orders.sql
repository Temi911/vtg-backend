drop policy if exists "active buyers create own LC request drafts for own orders" on public.buyer_lc_request_drafts;
create policy "active buyers create own LC request drafts for confirmed orders"
on public.buyer_lc_request_drafts
for insert
to authenticated
with check (
  buyer_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'buyer'::public.vtg_account_role
      and p.is_active = true
      and p.account_environment = 'trade'
  )
  and exists (
    select 1
    from public.trade_orders o
    where o.id = order_id
      and o.buyer_id = (select auth.uid())
      and o.status in (
        'confirmed'::public.vtg_order_status,
        'processing'::public.vtg_order_status,
        'shipped'::public.vtg_order_status,
        'in_transit'::public.vtg_order_status,
        'arrived'::public.vtg_order_status,
        'customs'::public.vtg_order_status
      )
  )
);

drop policy if exists "active buyers update own LC request drafts" on public.buyer_lc_request_drafts;
create policy "active buyers update own LC request drafts"
on public.buyer_lc_request_drafts
for update
to authenticated
using (
  buyer_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'buyer'::public.vtg_account_role
      and p.is_active = true
      and p.account_environment = 'trade'
  )
)
with check (
  buyer_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'buyer'::public.vtg_account_role
      and p.is_active = true
      and p.account_environment = 'trade'
  )
  and exists (
    select 1
    from public.trade_orders o
    where o.id = order_id
      and o.buyer_id = (select auth.uid())
      and o.status in (
        'confirmed'::public.vtg_order_status,
        'processing'::public.vtg_order_status,
        'shipped'::public.vtg_order_status,
        'in_transit'::public.vtg_order_status,
        'arrived'::public.vtg_order_status,
        'customs'::public.vtg_order_status
      )
  )
);
