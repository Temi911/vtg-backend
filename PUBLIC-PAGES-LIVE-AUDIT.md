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
6. Preferences: verify authenticated preference reads and language updates; the old `/api/auth/email-preferences/:token` unsubscribe link remains unmigrated because its token belongs to the retired PostgreSQL users table and has no equivalent Supabase token record yet.

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

## Important limitations of this first pass

This report combines repository source inspection with limited runtime checks of deployed Supabase endpoints. It does **not** claim that all pages, authenticated workflows, payment provider, email delivery or third-party data sources have passed full acceptance tests. Several route groups still need deeper inspection. All API traffic remains on Supabase; unsupported routes must be migrated rather than sent to Railway. The legacy marketing unsubscribe token endpoint is explicitly outstanding and must not be redirected to an incompatible handler.
