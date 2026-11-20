# VTG production go-live runbook

Status: **written without access to the production Supabase project (`lxrurbdzphqvkjprlfuv`).**
Nothing below has been run or verified there. The Claude Supabase connector only sees the staging project
(`tpstuaejpzsgjdtwzkkj`), where these migrations were applied and tested. Run the steps yourself in the
Supabase dashboard (SQL Editor) and tick each box.

The website itself deploys from `main` on Vercel. Everything here is the backend side that the site now depends on.

## 0. Before you start
- [ ] Take a backup / note the current time (Supabase → Database → Backups).
- [ ] Do not paste database passwords or the service-role key anywhere (chat, frontend code, logs).

## 1. Find out what production already has (read-only)
Run in the SQL Editor and keep the results:

```sql
select
  to_regclass('public.vtg_calls')                  as calls_table,
  to_regclass('public.vtg_chat_attachments')       as chat_attachments_table,
  to_regclass('public.vtg_ai_attachments')         as old_ai_attachments_table,
  exists(select 1 from storage.buckets where id='vtg-chat-attachments') as chat_bucket,
  exists(select 1 from storage.buckets where id='vtg-ai-attachments')   as ai_bucket,
  exists(select 1 from information_schema.columns
         where table_schema='public' and table_name='profiles' and column_name='onboarding_completed_at') as onboarding_col,
  exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.proname='vtg_complete_google_profile') as google_rpc,
  exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.proname='vtg_open_conversation') as chat_rpc,
  exists(select 1 from information_schema.columns
         where table_schema='public' and table_name='profiles' and column_name='vtg_user_id') as user_id_col,
  to_regclass('public.vtg_notifications') as notifications_table,
  exists(select 1 from pg_policies where schemaname='public' and tablename='vtg_inspection_evidence') as evidence_policy,
  to_regprocedure('public.vtg_supplier_inspections()') as supplier_inspections_fn;
```

## 2. Migrations, in this order (files in `supabase/migrations/`)
| # | File | Run it when |
|---|------|-------------|
| 1 | `20261114000000_vtg_chat_and_calls.sql` | `chat_rpc` or `calls_table` is empty/false. Largely idempotent. |
| 2 | `20261114101500_revert_vtg_chat_attachments.sql` | **Only** if `old_ai_attachments_table` or an old `chat_attachments_table` already exists from the earlier attachment attempt. It drops those tables and old storage policies. Skip it on a clean database. |
| 3 | `20261114120000_vtg_chat_attachments.sql` | `chat_attachments_table` is empty or `chat_bucket`/`ai_bucket` is false (after step 2 if that was needed). |
| 4 | `20261114200000_vtg_google_signup_profile.sql` | `google_rpc` is false. Adds `profiles.onboarding_completed_at` (existing rows backfilled) and `vtg_complete_google_profile`. |
| 5 | `20261115120000_vtg_user_id.sql` | `user_id_col` is false. Gives every user a permanent ID like `VTG-100001` (existing users numbered in sign-up order) and shows it in the buyer, supplier and bank dashboards. Until it runs, dashboards simply show no ID. |
| 6 | `20261116100000_vtg_notifications_and_inspection_evidence_access.sql` | `notifications_table` is null or `evidence_policy` is false. Creates the notifications table if missing (no earlier migration did) and lets buyers read the evidence of their own inspections. Idempotent. |
| 7 | `20261116130000_vtg_supplier_inspection_status.sql` | `select to_regprocedure('public.vtg_supplier_inspections()')` is null. Adds a read-only function so suppliers can see the status of inspections on their goods (no fees or findings). Without it the supplier Quality page's live panel shows "unavailable". Needs `vtg_inspection_requests` to exist. |
| 8 | `20261118090000_vtg_marketplace_product_review.sql` | `select 1 from information_schema.columns where table_name='products' and column_name='review_status'` returns no row. Supplier listings start as pending, VTG staff approve or reject them (`vtg_review_product`), and only approved listings of verified suppliers reach the buyer and public marketplace. Editing price, name or other commercial details sends a live listing back to review. Existing verified products stay approved. Tested on staging only; take a backup first. |
| 9 | `20261119060000_vtg_bank_live_workspace.sql` | `select to_regprocedure('public.vtg_bank_workspace_overview()')` is null. Makes the bank dashboard live: a buyer sends an LC request draft to a verified bank (`vtg_buyer_submit_lc_request`), the bank sees only its assigned cases (`vtg_bank_workspace_overview`), records a review (`vtg_bank_review_lc`), and the buyer is notified. Also adds `letters_of_credit.source_draft_id` (one LC per draft) and gives banks column-level UPDATE on `status`/`updated_at` only. Needs migration `20261106123000` (review events + guard trigger) first. Without it the bank page shows "unavailable" and buyers cannot send drafts. No LC is issued and no money moves. |
| 10 | `20261120090000_vtg_supplier_shipments_documents_lc_visibility.sql` | `select to_regprocedure('public.vtg_supplier_save_shipment(uuid,uuid,text,text,text,text,text,text,timestamptz,text,integer,text)')` is null. Connects the chain: suppliers record shipments (`vtg_supplier_save_shipment`) and send order documents (`vtg_supplier_add_order_document`) that the buyer and the assigned bank see and are notified of; bank review outcomes now notify and are readable by the supplier too. Needs rows 1 and 9 first (and `20261118090000` for product review). |
| 11 | `20261121090000_vtg_admin_live_dashboard.sql` | `select to_regprocedure('public.vtg_admin_overview()')` is null. Makes the administrator dashboard (`/admin-dashboard.html`) live: staff-only `vtg_admin_*` read functions, an append-only audit trail (`audit_events` made RLS-only, update/delete blocked, before/after triggers on product, verification-document and role-request reviews) and admin read access to verification files. Needs rows 1, 9 and 10 (and `20261118090000`). The admin account must have `role = 'admin'`, `is_active = true` and the staff account environment. |

Open each file, read it, paste it into the SQL Editor and run it. Re-run the query in section 1 afterwards; all
values for the features you want should now be non-null / true.

Quick safety checks after step 4 (read-only):
```sql
select p.proname, p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='vtg_complete_google_profile';
-- expect prosecdef = true and proconfig containing search_path=""
select has_function_privilege('anon','public.vtg_complete_google_profile(jsonb)','execute') as anon_can_run; -- expect false
```

## 3. Google sign-in (this is the cause of "provider is not enabled")
- [ ] Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → *Web application*.
- [ ] Authorized redirect URI: `https://lxrurbdzphqvkjprlfuv.supabase.co/auth/v1/callback`
- [ ] Supabase → Authentication → Sign In / Providers → Google → enable, paste Client ID and Client Secret (secret stays in Supabase only).
- [ ] Supabase → Authentication → URL Configuration: Site URL = your live domain; Redirect URLs include `https://<your-domain>/auth-callback.html`.
- [ ] Test: Continue with Google on `/signin.html`, then on each sign-up page (buyer, supplier, bank). A new Google user lands on `/complete-profile.html`; suppliers/banks end on `/verification.html`.

## 4. Edge functions
Deploy from the repo with the Supabase CLI (`supabase functions deploy <name> --project-ref lxrurbdzphqvkjprlfuv`) or from the dashboard.
`supabase/config.toml` sets `verify_jwt`: `vtg-email` = true; the other functions listed there = false (they check the caller themselves).
Functions in the repo: vtg-account-support, vtg-admin-roles, vtg-ai-assistant, vtg-bank-trade-workspace, vtg-email,
vtg-finance-inspections, vtg-inspection-payments, vtg-inspection-workflow, vtg-live-tracking, vtg-market-intelligence,
vtg-notifications, vtg-trade-operations, vtg-verification, vtg-wallet, workforce-invitations.
- [ ] Deploy all of them (the AI assistant, live tracking and email matter most for the buyer dashboard).
- [ ] Dashboard → Edge Functions: confirm each shows as active.

## 5. Secrets (Supabase → Edge Functions → Secrets; names only, set the values yourself)
| Secret | Needed for |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`), `SUPABASE_SERVICE_ROLE_KEY` | Normally injected by Supabase automatically. Never copy the service-role key into frontend code. |
| `VTG_APP_URL` / `APP_SITE_URL` | Links inside emails (your live site URL). |
| `RESEND_API_KEY`, `VTG_EMAIL_FROM` | Receipts, onboarding and notification emails. |
| `VTG_AI_API_KEY` (+ optional `VTG_AI_MODEL`, `VTG_AI_BASE_URL`) or `GEMINI_API_KEY` | AI assistant. Gemini is also required for video analysis. Other supported providers: `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`/`VTG_OPENAI_API_KEY`. |
| `TAVILY_API_KEY` | AI assistant live web search. |
| Vizion / Tracking.one keys and path/header settings | Live container tracking (see `supabase/functions/vtg-live-tracking`). |
| Paystack keys | Wallet / inspection payments (see `vtg-wallet`, `vtg-inspection-payments`). |

- [ ] Set the secrets you actually use; leave out providers you do not use.

## 6. Calls (voice/video in chat)
Calls use STUN only, which fails behind many mobile and corporate networks. Add a TURN server (e.g. a managed TURN
service) before relying on calls in production.

## 7. End-to-end check, one account per role
- [ ] Buyer: sign in, open dashboard (white logo loader, no black screen), AI assistant answers about your own orders, attach a PDF and an image in AI chat and in a supplier chat, shipment map shows only your shipments with a moving ship.
- [ ] Supplier: same checks; Google sign-up of a supplier outside China/South Korea is refused.
- [ ] Supplier (live data): after a buyer places an order with this supplier, the overview shows it under "Orders in progress"; an open buyer request raises "Open RFQs"; a submitted quotation raises the Analytics quotation count; once the order has a shipment with origin and destination ports, the supplier map shows only that route with the sea lane and ship; the Quality page lists any inspection on the goods; the Payments page lists any letter of credit linked to the order.
- [ ] Bank: same checks; Google bank sign-up creates a pending application, not a bank account.
- [ ] Click a port and an airport on the Trade Atlas: it zooms in, then shows details and photos.
- [ ] Confirm no secrets appear in browser dev tools (Network tab) other than the public publishable key.

## Rollback notes
Take the backup first. Migrations 1, 3 and 4 only add objects; migration 2 drops attachment tables, so run it only if
those tables hold nothing you need.
