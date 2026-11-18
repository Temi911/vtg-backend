# VTG Public Pages — Phase 1B API & Supabase Dependency Map

**Repository:** `Temi911/vtg-backend`  
**Branch:** `main`  
**Audit date:** 18 November 2026  
**Scope:** Public pages and their direct/shared-script API dependencies, current Vercel rewrites, Express route mounts, and existing Supabase Edge Function implementations.

## Executive finding

The public site is a Supabase-backed application with some legacy Express source still present in the repository. Marketplace quote requests use Supabase directly from the browser, and the Vercel API catch-all routes to the Supabase `vtg-api` Edge Function. Each dedicated Edge Function still needs an explicit rewrite before its route is considered migrated.

**Cutover update — 18 November 2026:** The Vercel API catch-all no longer points to Railway. It now points to the active Supabase `vtg-api` Edge Function. The live `vtg-api` source has been copied into `supabase/functions/vtg-api/index.ts` so the deployed handler is tracked in GitHub.

This removes Railway from Vercel API routing, but it does **not** mean every legacy endpoint has Supabase parity. The catch-all function currently implements a limited set of routes (profile, product discovery/publishing, orders, role requests, shipments, letters of credit, conversations/messages, documents, Africa Markets planning catalogue and a health check). Unsupported paths return a Supabase 404 instead of silently reaching Railway. Continue migrating and testing the remaining endpoint groups before calling the backend migration complete.

## 1. Routing truth from `vercel.json`

Current explicit Supabase rewrites:

| Vercel source | Supabase destination | Notes |
|---|---|---|
| `/api/partnerships` | `vtg-partnerships` | Public intake; validated, rate-limited, private database persistence; email notification is best-effort |
| `/api/africa/markets` | `vtg-api/api/africa/markets` | Explicit public planning/reference catalogue; country query returns one market |
| `/api/market-intelligence/tools/contract` and `/tools/landed-cost/estimate` | `vtg-market-intelligence/tools/*` | Authenticated active trade-role endpoints |
| `/api/market-intelligence/trade` | `vtg-market-intelligence/trade` | Authenticated UN Comtrade historical trade-statistics preview |
| `/api/contact` | `vtg-contact-enquiries` | Public consent-based enquiry intake with private storage |
| `/api/contact/admin` and `/api/contact/admin/:id` | `vtg-contact-enquiries/admin*` | Staff-admin-only inbox read and status update |
| `/api/admin/account-support` | `vtg-account-support/admin` | Explicit Supabase route |
| `/api/agent/:path*` | `vtg-inspection-workflow/agent/:path*` | Explicit Supabase route |
| `/api/inspections/requests/agent` | `vtg-inspection-workflow/requests/agent` | Explicit Supabase route |
| `/api/inspections/requests/:id/:action` | `vtg-inspection-workflow/requests/:id/:action` | Only this two-segment action shape is covered |
| `/api/shipment-events/:shipmentId` | `vtg-trade-operations/shipments/:shipmentId/events` | Explicit Supabase route |
| `/api/notifications/:path*` | `vtg-notifications/:path*` | Explicit Supabase route |
| `/api/notifications` | `vtg-notifications` | Explicit Supabase route |

The API catch-all is now:

``
/api/:path*  →  https://lxrurbdzphqvkjprlfuv.supabase.co/functions/v1/vtg-api/api/:path*
```

Trade Feed requests are routed to `vtg-marketplace`; unmatched API calls reach Supabase `vtg-api`. The function returns 404 for paths it does not implement; do not interpret the presence of the catch-all as proof that every route is migrated.

## 2. Public visitor journeys and dependencies

| Visitor journey | Frontend call / mechanism | Current route assessment | Supabase readiness |
|---|---|---|---|
| Marketplace product catalogue | Supabase client in `marketplace.html` | Direct Supabase, not the Railway catch-all | Existing foundation; verify active/approved product filters, product images, RLS and empty state |
| Marketplace quote request | RPC `vtg_create_trade_quote_request` | Direct Supabase RPC | Existing RPC and migration; test buyer auth, ownership, supplier visibility and resulting dashboard record |
| Trade Feed public read | `/api/marketplace/feed` | Supabase Edge Function `vtg-marketplace` | Public, read-only; publication-aware RLS; public author projection exposes only active feed authors |
| Trade Feed signed-in posts/comments/reactions/follows/media | `/api/marketplace/feed/account`, `/api/marketplace/feed/:id/comments`, `/api/marketplace/feed/:id/reactions`, `/api/marketplace/users/*`, `/api/media/feed/:id` | Supabase Edge Function `vtg-marketplace` plus `vtg-trade-feed-media` Storage bucket | Implemented in Supabase; authenticated writes use caller JWT and RLS; no service-role key in the function. Runtime authenticated upload/post/comment tests still required |
| Trade Feed news | `GET /api/market-intelligence/news`; compatibility alias `GET /api/integrations/news` | Supabase `vtg-market-intelligence/news` public GET route | Google News RSS primary with GDELT fallback; trusted-domain filtering, seven-day freshness cutoff and explicit feed timestamp caveat |
| Africa Markets catalogue | `GET /api/africa/markets`; optional `?country=NG` | Explicit Supabase rewrite to `vtg-api/api/africa/markets` | Implemented and live-tested: six static planning/reference markets; summary and Nigeria lookup return 200; unknown country returns 404; `liveProviderData:false` is preserved |
| Inspection request quote/create | `/api/inspections/quote`, `/api/inspections/requests`, `/api/inspections/mine` | Explicit Supabase rewrites to `vtg-inspection-workflow` | Route mapping is in place; authenticated request, pricing, ownership and agent workflow acceptance tests remain |
| Inspection payment | `/api/inspections/requests/:id/payment/initialize`, `/api/inspections/payment/verify`, `/api/webhooks/paystack` | Explicit Supabase rewrites to `vtg-inspection-payments` | Route mapping is in place; live Paystack initialization, signed webhook verification, idempotency and callback acceptance still need testing |
| Inspection agent actions | `/api/inspections/requests/agent`, `/api/inspections/requests/:id/:action`, `/api/agent/*` | Explicit Supabase rewrites | Supabase workflow function exists; test role/ownership, assignment, evidence storage and state transitions |
| Partnership application | `POST /api/partnerships` | Supabase Edge Function `vtg-partnerships` | Private `vtg_partnership_proposals` table; honeypot, input validation and per-IP rate limit. Email uses Resend when configured; otherwise the proposal is still saved and the response says notification is unavailable. Live form/email acceptance remains to be tested |
| Public VTG AI floating chat | `POST /api/ai/public-chat` | No matching explicit rewrite; no matching public route found in the inspected Express route mounts | Not proven connected. Existing `vtg-ai-assistant` function is for assistant chat workflows but is not automatically a public endpoint; design a safe public endpoint/rate-limit model |
| Public market intelligence tools | `GET /api/market-intelligence/tools/contract`, `POST /api/market-intelligence/tools/landed-cost/estimate` | Explicit Supabase rewrites to `vtg-market-intelligence/tools/*` | Implemented in Edge Function v16+; authenticated active buyer, supplier, bank or admin; landed cost remains indicative and uses user-supplied rates |
| Market trade statistics | `GET /api/market-intelligence/trade` | Explicit Supabase rewrite to `vtg-market-intelligence/trade` | Implemented; authenticated active trade roles; UN Comtrade preview is historical statistics, not a live quote |
| Trade Atlas | Bundled port/airport reference data, map libraries and local map scripts | Mostly static reference data; map tiles/geocoding are external browser dependencies | Not a live port-operation or verified supplier-location feed; distinguish static reference locations from operational status |
| Contact | `POST /api/contact`; staff inbox `GET /api/contact/admin` | Supabase Edge Function `vtg-contact-enquiries` | Private RLS table, consent, honeypot, hashed-IP rate limit, optional Resend notification and staff-only inbox API; public page is deployed, but POST and staff inbox need authenticated acceptance tests |
| Sourcing page | Static informational page in the inspected source | No form/API submission found in first pass | Needs a real request workflow; marketplace quote RPC can be reused only where its data model genuinely fits |
| Product verification | Static informational page in first pass | No live lookup route found | Needs a defined verification record/provider and secure result policy before promising live verification |

## 3. Backend route inventory discovered

The Railway Express server mounts these public-relevant route groups:

- `/api/marketplace`
- `/api/media`
- `/api/inspections`
- `/api/partnerships`
- `/api/market-intelligence`
- `/api/integrations`
- `/api/africa`
- `/api/ai-assistant`
- `/api/market`
- `/api/atlas`
- `/api/trade`

The inspection Express router currently exposes buyer quote/request/payment actions and agent/admin actions. The Supabase inspection workflow function has direct Supabase implementations for buyer pricing/request creation, buyer request listing, staff/agent queues, assignment, status updates and evidence metadata/storage. The current Vercel rewrites cover only agent/staff action URL shapes, not the full buyer request lifecycle.

The Supabase market-intelligence Edge Function now serves public news, authenticated trade-statistics retrieval, provider-contract discovery and indicative landed-cost estimates. The public Trade Feed continues to use the compatible `/api/market-intelligence/news` path.

## 4. Risk-ranked migration queue

### P0 — Preserve existing production behaviour

1. Keep all API traffic on Supabase; do not restore a Railway fallback.
2. Do not treat a route as migrated until its request/response contract, auth requirements, role checks, error handling and RLS/storage access are verified.
3. Keep specific function rewrites ahead of the `/api/:path*` catch-all.
4. Track unsupported endpoints explicitly; they currently return 404 from `vtg-api` until their Supabase implementation is completed.

### P1 — Highest-value public journey

**Marketplace → buyer quote request → supplier opportunity → buyer status.**

- Confirm catalogue queries only return active, approved supplier products.
- Confirm the RPC rejects unauthorised users and invalid product/quantity combinations.
- Confirm the resulting record appears to the correct supplier and buyer.
- Verify that no demo/local fallback product is rendered as real inventory.

This is the strongest existing public-to-Supabase path and should be the first full end-to-end acceptance test.

### P2 — Trade Feed and public news

- Verify source attribution, timestamps, seven-day freshness filtering, deduplication and provider-failure behaviour on `vtg-market-intelligence/news`.
- Verify authenticated `/trade`, `/tools/contract` and `/tools/landed-cost/estimate` using buyer, supplier, bank and admin sessions.
- Verify the Supabase trade-feed tables, RLS, media bucket policies, moderation and signed-in post/comment/reaction/follow paths.
- These routes are already mapped to Supabase; do not reintroduce Railway.

### P3 — Inspection journey

- Align the public buyer quote/create routes with the Supabase workflow function.
- Verify the payment Edge Function, Paystack initialization, callback, signed webhook verification and atomic payment confirmation.
- Keep the inspection and payment routes on their Supabase Edge Functions; complete provider test-mode and signed-webhook acceptance before treating payment workflows as production-verified.
- Keep agent evidence uploads private and enforce inspection ownership/assignment checks.

### P4 — Partnership, contact and public AI

- Partnership submissions now create durable private Supabase records. Contact enquiries now have a private Supabase intake and staff-only inbox; live submission, staff review and email-delivery acceptance remain.
- Public AI needs a dedicated public-safe handler with rate limits, abuse controls, input limits, no provider secrets in the browser, and a clear handoff to a recorded enquiry.
- Confirm email delivery and retry/error logging independently from database persistence.

### P5 — Reference pages

- Preserve Africa Markets as a clearly labelled planning catalogue unless a trusted live provider is connected.
- Keep Trade Atlas reference data clearly distinguished from live port operations.
- Add source and last-updated metadata before introducing any market figures as current.

## 5. Recommended next implementation sequence

1. **Marketplace acceptance test** against production Supabase (read products, create a test quote request using a controlled test account, confirm buyer/supplier visibility, then clean up the test record safely).
2. **Trade Feed parity review**: compare schemas, RLS, storage bucket policies and response contracts before changing rewrites.
3. **Inspection parity review**: buyer create/quote and payments before changing the route map.
4. **Partnership/contact acceptance**: submit controlled test proposals and enquiries, verify staff-only inbox visibility and email delivery status.
5. **Public AI connection**: dedicated public function and safe usage controls.
6. **Only after these pass**: migrate individual routes and gradually remove the Railway fallback.

## 6. Verification boundary

This document is based on source inspection of the repository, Vercel rewrite configuration, Express route mounts, and deployed Supabase function implementations. The Vercel production deployment for commit `d2a345f391e40a007c6f1aeba8280c6a1ec525b8` reached READY. This confirms the deployment build, not successful authenticated API calls. It does not claim that payment transactions, emails, media uploads, dashboard visibility or all API route contracts have passed live acceptance tests.
