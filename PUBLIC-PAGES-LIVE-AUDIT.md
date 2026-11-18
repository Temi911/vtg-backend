# VTG Public & Trade Pages — Live Readiness Audit

**Repository:** `Temi911/vtg-backend`  
**Branch reviewed:** `main`  
**Audit type:** First-pass static code audit (HTML, linked scripts, API routes and Vercel rewrites)  
**Date:** 18 November 2026

## Executive summary

The public website is not a single uniform implementation. Some pages already use Supabase directly, some call backend `/api/*` routes that still fall through to Railway, some are primarily static information pages, and some contain sample/demo content or hard-coded market data.

The correct next step is to map each public journey to its data source and test it in the browser before replacing or rewriting anything. Preserve the approved design and existing working functionality.

## Key architecture finding

The current `vercel.json` explicitly routes selected endpoints to Supabase Edge Functions:

- `/api/admin/account-support` → `vtg-account-support`
- `/api/agent/*` → `vtg-inspection-workflow`
- `/api/inspections/requests/agent` and `/api/inspections/requests/:id/:action` → `vtg-inspection-workflow`
- `/api/shipment-events/:shipmentId` → `vtg-trade-operations`
- `/api/notifications/*` → `vtg-notifications`

However, the catch-all `/api/:path*` rewrite still points to the Railway backend. Therefore any API endpoint not matched by an earlier Supabase rewrite may still depend on Railway. Do not remove that fallback until each route has been migrated and tested.

The shared browser auth script, `vtg-supabase-auth.js`, initialises the configured Supabase project directly using its publishable key. The publishable key is expected in a browser client; service-role or secret keys must never be exposed there.

## First-pass page inventory

Status labels describe code evidence only, not a completed live browser test.

| Page | Code evidence | Initial assessment |
|---|---|---|
| `frontend-v3.html` | Main landing page; shared interaction scripts; API calls include auth and market dashboard | Mixed: several live interactions, some API dependencies need route-by-route tracing |
| `marketplace.html` | Supabase client; product catalogue and quote-request RPC `vtg_create_trade_quote_request` | Strong Supabase foundation; verify product visibility, RLS, empty state, quote creation and buyer handoff |
| `sourcing-suppliers.html` | Mostly content and shared shell; no form or API call found in first pass | Primarily informational; needs a real sourcing-request journey |
| `trade-feed.html` | Calls `/api/marketplace`, `/api/market-intelligence/news`, `/api/integrations/news`, feed and media endpoints | Mixed backend dependencies; public read, signed-in posting, media and moderation need separate tests |
| `trade-atlas.html` | Large interactive map; local port dataset and map scripts | Map data is largely bundled/static; distinguish reference data from live port/operational status |
| `market-intelligence.html` | Loads `vtg-market-intelligence-live.js`; sample/placeholder markers in page | Needs verification of live sources, freshness and graceful unavailable states |
| `intelligence-centre.html` | Four forms; calls auth and market-intelligence APIs; sample/demo/placeholder markers | Mixed; tools need endpoint and data-provenance audit |
| `africa-markets.html` | Loads `/api/africa/markets`; response explicitly identifies `planning_data` and `liveProviderData:false`; includes hard-coded demand values | Planning/reference catalogue, not live market intelligence; label all values and sources clearly |
| `vtg-ai.html` | Demo/sample markers; no direct API call in page source | Public AI journey not yet evidenced as connected |
| `contact.html` | Form prepares a `mailto:` message | Not a server-submitted enquiry; delivery depends on visitor email application |
| `about-vintage.html` | Static company content and shared shell | Mostly informational; verify facts, links and controls |
| `trade-guide.html` | Static guide with sample marker | Informational; verify claims and replace sample examples where presented as actual data |
| `logistics-shipping.html` | Static content; no form/API found | Informational; live shipment tracking should not be implied without a connected shipment record/provider |
| `inspection-request.html` | Calls `/api/inspections` for quote, request and payment initialisation | Functional flow exists in code, but route currently appears subject to Railway catch-all unless another route is added; verify end-to-end before describing as live |
| `product-verification.html` | Static content; no form/API found | No live verification lookup evidenced |
| `network.html` | Lightweight navigation/redirect page | Verify destinations and role routing |
| `partnerships.html` | Static pathway page | Verify pathway links and application handoff |
| `partnership-application.html` | Posts form to `/api/partnerships` | Likely Railway-dependent via catch-all; verify persistence, email routing and staff review |
| `finance-payments.html` | Not yet deeply inspected | Requires a separate payment-provider, legal and security review |
| `account-help.html` | Not yet deeply inspected | Requires auth/support journey review |
| `signin.html`, `signup.html`, role signup pages | Auth entry points | Must be tested against Supabase Auth, role assignment, verification, redirects and pending approval |
| `privacy.html`, `terms.html`, `code-of-conduct.html` | Legal/information pages | Review wording and operational consistency; not primarily database-backed |

## Priority findings

### P0 — Trace backend routing before more public-page changes

1. Enumerate every `/api/*` endpoint used by public pages and shared scripts.
2. Match each endpoint against `vercel.json` rewrites and Supabase Edge Functions.
3. Identify which endpoints still reach Railway.
4. Check the relevant Supabase tables, RPCs, Edge Functions and RLS policies.
5. Keep Railway fallback active until all affected flows pass production tests.

### P1 — Complete the first visitor-to-trade journey

1. Marketplace: approved supplier products → product detail → buyer sign-in → quote request → supplier opportunity → buyer-visible request status.
2. Sourcing: public request form → Supabase record → staff assignment → supplier matching → buyer update.
3. Contact: replace mail-client-only delivery with a recorded enquiry and clear confirmation, while retaining a fallback contact option.
4. Partnership application: verify durable submission, reference number, notifications and staff review queue.

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

This report is based on repository source inspection. It does **not** claim that the pages, Supabase policies, Edge Functions, Railway endpoints, payment provider, email delivery or third-party data sources have passed runtime tests. Several pages still need deeper inspection. No application code or backend configuration was changed as part of this audit.
