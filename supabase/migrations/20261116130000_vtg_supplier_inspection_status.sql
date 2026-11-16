-- Lets a supplier see the status of inspections raised on their own goods,
-- without exposing buyer fees, agent payouts, findings or notes.
create or replace function public.vtg_supplier_inspections()
returns table (
  reference text, order_id uuid, product_name text, inspection_type text,
  status text, requested_date date, completed_at timestamptz, created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.reference::text, r.order_id, r.product_name::text, r.inspection_type::text,
         r.status::text, r.requested_date::date, r.completed_at, r.created_at
  from public.vtg_inspection_requests r
  where r.supplier_id = (select auth.uid())
    and exists (select 1 from public.profiles p
                where p.id = (select auth.uid()) and p.role = 'supplier' and p.is_active = true)
  order by r.created_at desc
  limit 200;
$$;
revoke all on function public.vtg_supplier_inspections() from public, anon;
grant execute on function public.vtg_supplier_inspections() to authenticated;
