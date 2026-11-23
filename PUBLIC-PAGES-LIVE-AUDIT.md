# VTG Public & Trade Pages — Live Readiness Audit

**Repository:** `Temi911/vtg-backend`  
**Branch reviewed:** `main`  
**Audit type:** First-pass static code audit (HTML, linked scripts, API routes and Vercel rewrites)  
**Date:** 18 November 2026

## Executive summary

The public website is not a single uniform implementation. Some pages already use Supabase directly, some call backend `/api/*` routes that now reach Supabase but still need individual acceptance tests, some are primarily static information pages, and some contain sample/demo content or hard-coded market data.

The correct next step is to map each public journey to its data source and test it in the browser before replacing or rewriting anything. Preserve the approved design and existing working functionality.

## Key architecture finding

The current `vercel.json` routes API traffic to Supabase Edge Functions only. Dedicated rewrites cover selected workflows; all other `/api/*` requests reach `vtg-api`, which deliberately returns 404 for unsupported operations:

- `/api/admin/account-support` → `vtg-account-support`
- `/api/agent/*` → `vtg-inspection-workflow`
- `/api/inspections/requests/agent` and `/api/inspections/requests/:id/:action` → `vtg-inspection-workflow`
- `/api/shipment-events/:shipmentId` → `vtg-trade-operations`
- `/api/notifications/*` → `vtg-notifications`
- `/api/partnerships` → `vtg-partnerships`
- `/api/contact` and `/api/contact/admin*` → `vtg-contact-enquiries`
- `/api/auth/me` → `vtg-api`
- `GET /api/preferences` and `PATCH /api/preferences/language` → `vtg-api`
- `/api/trade/landed-cost` → `vtg-market-intelligence` (Nigeria-only illustrative calculator)
- `/api/africa/markets` → `vtg-api` (planning/reference catalogue)
- `/api/market-intelligence/news`, tools and trade statistics → `vtg-market-intelligence`
- `/api/market-intelligence/*` news, tools and trade statistics → `vtg-market-intelligence`

However, the catch-all `/api/:path*` rewrite now points to the Supabase `vtg-api` Edge Function. There is no Railway fallback. The catch-all implements only a limited set of operations; unsupported paths return a Supabase 404 until their individual implementations are completed.

The shared browser auth script, `vtg-supabase-auth.js`, initialises the configured Supabase project directly using its publishable key. The publishable key is expected in a browser client; service-role or secret keys must never be exposed there.

## Email preference migration — 18 November 2026

`vtg-email-preferences` is ACTIVE (v5). `vtg-email` is ACTIVE (v14) and now adds a fresh Supabase preference link to onboarding emails. The signup trigger stores the optional `marketing_subscribed` choice (default false); existing Auth metadata was backfilled without overwriting any existing preference. Token consumption and the opt-out update run in one database transaction through a service-role-only RPC. Both preference tables have RLS enabled and direct `anon`/`authenticated` privileges revoked. Marketing email event types are suppressed unless the recipient has explicitly opted in; transactional onboarding, security, account and trade messages remain available. The Vercel rewrites are committed but must reach a READY production deployment, and Resend delivery still needs an end-to-end test with the configured Edge Function secrets.

## First-pass page inventory

Status labels describe code evidence only, not a completed live browser test.

| Page | Code evidence | Initial assessment |
|---|---|---|
| `frontend-v3.html` | Main landing page; shared interaction scripts; API calls include auth and market dashboard | Mixed: several live interactions, some API dependencies need route-by-route tracing |
| `marketplace.html` | Supabase client; product catalogue and quote-request RPC `vtg_create_trade_quote_request` | Strong Supabase foundation; verify product visibility, RLS, empty state, quote creation and buyer handoff |
| `sourcing-suppliers.html` | Mostly content and shared shell; no form or API call found in first pass | Primarily informational; needs a real sourcing-request journey |
| `trade-feed.html` | Supabase-backed `/api/marketplace/*`, `/api/media/feed/:postId`, and public `/api/market-intelligence/news` | Public posts, comments, reactions, follows, media and source-linked news now route to Supabase; moderation and authenticated end-to-end actions still require acceptance tests |
| `trade-atlas.html` | Large interactive map; local port dataset and map scripts | Map data is largely bundled/static; distinguish reference data from live port/operational status |
| `market-intelligence.html` | Loads `vtg-market-intelligence-live.js`; market watch cards are explicitly labelled pending/verify | News now comes from the Supabase Edge Function; verify freshness and authenticated trade-statistics/calculator workflows. FX, tariff and freight providers remain unconnected |
| `intelligence-centre.html` | Four forms; calls auth and market-intelligence APIs; sample/demo/placeholder markers | Mixed; tools need endpoint and data-provenance audit |
| `africa-markets.html` | Loads `/api/africa/markets`; explicit Supabase `vtg-api` route returns `planning_data` and `liveProviderData:false` | Catalogue endpoint live-tested: six planning markets, Nigeria lookup and unknown-country 404; hard-coded demand figures remain separate page content and must not be described as live data |
| `vtg-ai.html` | Demo/sample markers; no direct API call in page source | Public AI journey not yet evidenced as connected |
| `contact.html` | Posts to `/api/contact` | Supabase private enquiry storage, consent and anti-spam controls deployed; POST submission and staff review still require live acceptance tests |
| `about-vintage.html` | Static company content and shared shell | Mostly informational; verify facts, links and controls |
| `trade-guide.html` | Static guide with sample marker | Informational; verify claims and replace sample examples where presented as actual data |
| `logistics-shipping.html` | Static content; no form/API found | Informational; live shipment tracking should not be implied without a connected shipment record/provider |
| `inspection-request.html` | Calls `/api/inspections` for quote, request and payment initialisation | Dedicated Supabase inspection workflow/payment rewrites exist; verify authenticated buyer request, payment provider and webhook end-to-end before describing the complete journey as live |
| `product-verification.html` | Static content; no form/API found | No live verification lookup evidenced |
| `network.html` | Lightweight navigation/redirect page | Verify destinations and role routing |
| `partnerships.html` | Static pathway page | Verify pathway links and application handoff |
| `partnership-application.html` | Posts form to `/api/partnerships` | Supabase `vtg-partnerships` private persistence and validation deployed; verify form submission, email status and staff review |
| `finance-payments.html` | Not yet deeply inspected | Requires a separate payment-provider, legal and security review |
| `account-help.html` | Not yet deeply inspected | Requires auth/support journey review |
| `signin.html`, `signup.html`, role signup pages | Auth entry points | Must be tested against Supabase Auth, role assignment, verification, redirects and pending approval |
| `privacy.html`, `terms.html`, `code-of-conduct.html` | Legal/information pages | Review wording and operational consistency; not primarily database-backed |

## Priority findings

### P0 — Trace backend routing before more public-page changes

1. Enumerate every `/api/*` endpoint used by public pages and shared scripts.
2. Match each endpoint against `vercel.json` rewrites and Supabase Edge Functions.
3. Identify unsupported endpoints that currently return 404 from the Supabase catch-all.
4. Check the relevant Supabase tables, RPCs, Edge Functions and RLS policies.
5. Keep all API traffic on Supabase; do not restore a Railway fallback.

### P1 — Complete the first visitor-to-trade journey

1. Marketplace: approved supplier products → product detail → buyer sign-in → quote request → supplier opportunity → buyer-visible request status.
2. Sourcing: public request form → Supabase record → staff assignment → supplier matching → buyer update.
3. Contact: run a controlled POST submission, verify the returned reference, private database record, email status and staff-only inbox.
4. Partnership application: verify durable submission, reference number, notifications and staff review queue.
5. Authentication: verify `/signin.html`, each role-specific signup page and `/api/auth/me` using active and pending accounts.
6. Preferences: authenticated preference reads and language updates are implemented in `vtg-api`. The old `/api/auth/email-preferences/:token` route now maps to a Supabase-issued 256-bit token stored only as a SHA-256 hash, expires after seven days, and requires an explicit POST confirmation (GET is read-only). Signup consent is persisted from Supabase Auth metadata, existing Supabase metadata was backfilled without overwriting saved choices, and marketing-event sends are suppressed unless the user opted in. Old PostgreSQL tokens cannot be carried over and remain invalid. Supabase functions are deployed; Vercel production routing and real Resend delivery still require verification.

### P2 — Public information and intelligence

1. Trade Feed: separate editorial/news ingestion from member posts; show source, date and freshness; test media upload and moderation.
2. Market Intelligence and Africa Markets: identify each dataset's source, update frequency and whether it is historical, planning-only or live.
3. Trade Atlas: identify static reference data versus live operational data; do not present a port's presence on a map as live port status.
4. Public VTG AI: connect through a server-side function, protect provider secrets, test provider fallbacks and give clear error messages.

### P3 — Remaining pages and polish

Review all informational pages, navigation, mobile layouts, language/theme controls, accessibility, legal copy and broken links. Do not add subscriptions or paid ranking as part of this phase.

## Required acceptance checks

A page is only marked **Live and verified** after its visitor journey is tested on the production deployment:

- Correct data source and owner identified.
- No demo/sample data represented as live.
- Form validation and submission work.
- Successful writes are visible to the intended user/staff role.
- RLS prevents unauthorised reads and writes.
- Notifications and status transitions are confirmed.
- Empty, loading, timeout and error states are usable.
- Mobile and desktop interactions work.
- External data has source and last-updated metadata.
- The exact production deployment is checked after release.

## Email preference migration update — 18 November 2026

The `vtg-email-preferences` Edge Function is ACTIVE (v3), and `vtg-email` is ACTIVE (v13). Supabase signup metadata is persisted to `vtg_email_preferences`; existing Auth metadata was backfilled without overwriting existing choices. New onboarding emails include a fresh seven-day preference link directly to the Supabase confirmation function, so the link works even while Vercel's route rewrites await deployment. Tokens contain 256 bits of randomness and only their SHA-256 hashes are stored. GET is read-only; explicit POST invokes a service-role-only database function that atomically consumes the token and records opt-out. Both tables have RLS enabled and direct `anon`/`authenticated` access revoked. Marketing email event types require both explicit opt-in and an unsubscribe URL. The old PostgreSQL tokens cannot be migrated and remain invalid. Vercel rewrites are committed but are not in the latest READY production deployment. New welcome links currently go directly to Supabase to avoid broken links; Resend delivery has not yet been end-to-end tested.

## Important limitations of this first pass

This report combines repository source inspection with limited runtime checks of deployed Supabase endpoints. Supabase `vtg-api` is deployed at v21 with account-preference routes; the matching Vercel rewrites are committed but are not yet in the latest READY production deployment because Vercel reports a build-rate limit. It does **not** claim that all pages, authenticated workflows, payment provider, email delivery or third-party data sources have passed full acceptance tests. Several route groups still need deeper inspection. All API traffic remains on Supabase; unsupported routes must be migrated rather than sent to Railway. Supabase now has a replacement unsubscribe-token system. Legacy PostgreSQL tokens remain incompatible and must not be represented as migrated.


## 2026-11-23 follow-up — catalogue and permissions audit

This follow-up records the additional live checks performed against the connected VTG Supabase project and the public production alias. It is not a claim that every authenticated workflow has completed an end-to-end browser test.

### Confirmed defects fixed

- Supplier catalogue inserts were failing in the `private.vtg_products_review_guard()` trigger because authenticated sessions had no `USAGE` on the `private` schema. Applied and committed `20261123190000_grant_authenticated_private_schema_usage.sql`. This grants schema usage to `authenticated` only; it does not grant usage to `anon` or broaden function execution rights.
- Trusted Edge Functions were missing required `service_role` table privileges. Applied and committed `20261123190500_restore_edge_function_service_role_table_privileges.sql` for workforce membership/invitations, inspection pricing/requests, trade-order reads, profile updates and audit-event inserts. No client-role grants were added by this migration.
- Added `vtg-backend/test/supplier-product-save-permissions.contract.test.js` to protect the supplier insert/feedback contract and both permission migrations.

### Live checks completed

- Simulated an authenticated supplier insert against `public.products`; the review trigger returned a new row with `review_status='pending'` and `is_verified=false`. The transaction was rolled back, leaving no test product behind.
- Confirmed the authenticated admin helper returns true for the active admin identity and the admin product-queue RPC executes.
- Confirmed the admin can see the seven objects in the private verification-document bucket through the storage RLS policy. Those seven objects are all owned by the supplier account tested; the supplier's own visibility is therefore expected.
- Verified the service-role grants with `has_table_privilege`.
- Checked that the nine RLS-enabled/no-policy tables flagged by Supabase are server-only: `anon` and `authenticated` have no SELECT privilege; `service_role` has access.
- Checked the exposed `SECURITY DEFINER` RPC set: none of the inspected functions is executable by `anon`. The admin RPCs inspected use the private admin gate/helper; the conversation-members RPC checks actual conversation membership; the bank workspace RPC requires the active, verified bank identity.
- Reviewed the public landing page, sign-in, marketplace, Trade Atlas, Market Intelligence, Africa Markets, VTG AI, Trade Feed, contact, partnership application, inspection request, verification portal and workforce access routes. Protected role dashboards redirect unauthenticated visitors to the appropriate sign-in page.

### Still requires verification or configuration

- A real signed-in supplier/admin browser test is still required to confirm the supplier can save a real listing and that the admin can open a real document preview. The SQL checks validate the underlying trigger, RPC and storage policy, not the browser's signed-URL flow.
- The contract test file has been committed but has not been executed in a repository test runner during this pass.
- GitHub reports the Vercel check as successful for the latest audit commit. The Vercel deployment-inspection API returns 403 for this project, and the deployment preview URLs are behind Vercel login protection, so the exact deployed production commit could not be independently confirmed here.
- Supabase Security Advisor still reports leaked-password protection disabled. This requires an Auth security setting change in the Supabase dashboard; it was not changed in this pass.
- Supabase also reports authenticated-callable `SECURITY DEFINER` functions. The role/membership guards described above were inspected, but a complete function-by-function review remains a separate security-hardening task.
