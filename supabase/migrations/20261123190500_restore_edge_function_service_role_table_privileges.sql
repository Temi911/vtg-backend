-- Restore only the server-side privileges required by trusted Supabase Edge Functions.
-- These grants are limited to service_role; no anon or authenticated client access is added.
grant select, insert, update on public.vtg_workforce_members to service_role;
grant select, insert, update on public.vtg_workforce_invitations to service_role;
grant select, insert, update on public.vtg_inspection_pricing to service_role;
grant select, insert, update on public.vtg_inspection_requests to service_role;
grant select on public.trade_orders to service_role;
grant update on public.profiles to service_role;
grant insert on public.audit_events to service_role;
