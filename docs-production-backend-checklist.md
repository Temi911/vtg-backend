# VTG buyer dashboard: production Supabase checklist

Run these against the production project (lxrurbdzphqvkjprlfuv). Nothing here has been verified by Claude; the production project was not reachable from the build environment.

## 1. Edge functions the buyer dashboard calls
Deploy (`supabase functions deploy <name>`) and confirm each appears under Edge Functions:
- vtg-inspection-workflow  (inspection quote + request form)
- vtg-ai-assistant         (AI assistant)
- vtg-live-tracking        (shipment tracking panel)
- vtg-market-intelligence  (intelligence page)

Secrets to set (Edge Functions > Secrets): VTG_AI_API_KEY (and optionally VTG_AI_BASE_URL, VTG_AI_MODEL), RESEND_API_KEY, VTG_EMAIL_FROM, VTG_APP_URL. Never put these in frontend code.

## 2. Tables that must exist
Check in the SQL editor:
```sql
select to_regclass('public.profiles'), to_regclass('public.buyer_profiles'),
       to_regclass('public.trade_orders'), to_regclass('public.trade_quotes'),
       to_regclass('public.products'), to_regclass('public.trade_documents'),
       to_regclass('public.vtg_inspection_requests'), to_regclass('public.vtg_inspection_evidence'),
       to_regclass('public.vtg_inspection_pricing'), to_regclass('public.buyer_cart_states');
```
Every value must be non-null. NOTE: vtg_inspection_pricing is not created by any migration in the repo, so it may be missing.

## 3. Inspection prices (needed or the fee quote returns "No active price configured")
Columns used by the function: country ('China' or 'South Korea'), category, service_level ('basic'|'standard'|'advanced'), min_quantity, max_quantity (null = no limit), buyer_fee_usd, agent_payout_usd, active.
Add at least one active row per country with category 'general-merchandise' and each service level.

## 4. Repo migrations applied
Compare Database > Migrations with supabase/migrations (39 files, latest 20261106150000). Apply missing ones in order.

## 5. Storage
Bucket vtg-trade-documents exists and is private.

## 6. Smoke test with a real buyer account
Sign in, then: marketplace loads products; add to cart; "Request quotations"; RFQs page shows the request; Product verification > Request inspection quotes a fee; AI assistant answers; upload a PDF under Documents.
