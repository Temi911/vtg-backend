# Phase 4 — API Compatibility and Preview QA

Status date: 2026-10-28
Scope: branch `fix/supabase-api-routing` and its Vercel Preview deployment only.

## Verified backend contract

The Supabase project currently has RLS-enabled tables for profiles, buyer/supplier/bank profiles, products, trade orders, shipments, trade documents, supplier verification documents, letters of credit, conversations, conversation participants, messages, audit events, and role requests.

The deployed `vtg-api` Edge Function (version 4) implements:
- Public product discovery: `GET /api/products`
- Authenticated profile/dashboard reads: `GET /api/me`, `GET /api/market/dashboard`
- Product and order creation/listing: `GET|POST /api/products`, `GET|POST /api/orders`
- Role requests: `GET|POST /api/role-requests`
- Shipment listing and per-order lookup: `GET /api/shipments`, `GET /api/shipments/order/:orderId`
- Letters of credit: `GET|POST /api/letters-of-credit` (also aliased as `/api/lc`)
- Conversations and messages: `GET|POST /api/conversations`, `GET|POST /api/messages`
- Document metadata: `GET /api/documents/order/:orderId`, `POST /api/documents`

The Vercel proxy forwards only the caller's Authorization header and a publishable/anon API key; it must never use a service-role key.

## Known compatibility blockers

1. **Trade feed:** The existing buyer dashboard calls `GET /api/marketplace/feed` and `POST /api/marketplace/feed/account`. The current Supabase schema has no marketplace feed/posts table, and `vtg-api` has no handlers for these routes. They still hit the legacy Railway rewrite and return its `Application not found` 404. Do not redirect them to an unrelated table or fabricate feed content. A proper implementation needs a feed data model, RLS/participant rules, and API handlers.
2. **Auth/account APIs:** Existing pages call `/api/auth/*` for signup, login, email verification, agreements and password recovery. These are not implemented by `vtg-api` and still depend on the legacy backend. Do not switch these routes until equivalent Supabase Auth flows and email delivery/reset behavior are validated.
3. **Inspection/payment APIs:** Existing pages call `/api/inspections/*` for requests, quoting, payment initialization and verification. These are not implemented by `vtg-api`; payment routes must remain on their current backend until a complete verified replacement exists.
4. **Market dashboard response contract:** The current `GET /api/market/dashboard` implementation returns aggregate counts after authentication, while the landing-page visual enhancer expects a `news` array and does not send an Authorization header. This is a response/auth contract mismatch to resolve separately; do not expose protected order counts publicly to satisfy the news widget.

## Acceptance checks before any merge

- Public health check returns 200 and database connectivity is confirmed.
- Product discovery returns a JSON product array (empty is valid when no listings exist).
- Protected routes reject missing/invalid tokens with 401.
- Authenticated buyer/supplier/bank sessions can access only rows permitted by RLS and role policy.
- Negative cross-account tests prove orders, shipments, documents, messages and letters of credit cannot be read or changed by unrelated users.
- Dashboard browser checks cover API failures, login/logout, refresh, and mobile layouts.
- Feed, auth and inspection/payment APIs are either implemented and tested end-to-end or explicitly left on the legacy backend.

## Rollout guardrails

This is a QA record for the preview branch, not a declaration that Phase 4 has passed. Keep PR #18 unmerged and do not change production aliases, production environment variables, or Railway settings until the protected-route and cross-account tests pass.
