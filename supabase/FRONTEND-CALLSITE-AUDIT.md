# VTG Frontend API Call-Site Audit

**Date:** 2026-11-05  
**Initial inspection:** `main` at `16911509500ee005baf21384d950fb908d7241da`  
**Follow-up inspection:** `main` at `257076b614f90345ae5d8ab99aac015321b663f6`

This is a targeted call-site review of key buyer, supplier, bank, agent, marketplace, feed, inspection and workforce pages. It supplements `API-PARITY-AUDIT.md`; it is not yet a complete scan of every frontend file.

## Confirmed frontend dependencies

| Frontend | API calls confirmed in source | Migration implication |
|---|---|---|
| Buyer dashboard | `/api/network/directory`, `/api/network/relationships`, `/api/market-intelligence/news`, `/api/integrations/news`, `/api/market-intelligence/tools/contract`, `/api/marketplace/enquiries/mine`, `/api/quotes`, quote status/convert, `/api/marketplace/enquiries`, marketplace feed/reactions/comments, `/api/messages`, `/api/inspections/requests/*`, `/api/lc`, `/api/orders`, `/api/shipments/order/*`, `/api/documents/order/*`, document upload/download, `/api/ai-assistant/chat` | A large portion of the active buyer workspace depends on routes not yet covered by Supabase. |
| Supplier dashboard | Network directory/relationships, AI assistant, plus legacy API helper calls | Supplier profile, product management, storefront and quote operations need a deeper call-site inventory. |
| Bank Trade OS | Network directory and relationships, plus legacy API helper calls | Bank operations, LC review, compliance, trade-risk and admin endpoints remain blockers. |
| Agent dashboard | `/api/agent/me`, `/api/agent/stats`, `/api/inspections/requests/agent`, verification document list/upload, inspection start/evidence/submit | Current Supabase inspection workflow does not yet prove parity with the legacy agent profile/stats endpoints and legacy document contract. |
| Marketplace | `/api/products`, `/api/quotes` | Public product discovery exists in Supabase; quote create/response lifecycle is only partial. |
| Trade Feed | `/api/marketplace/feed` GET and POST, `/api/marketplace/feed/:id/reactions`, comments, `/api/media/feed/:id`, `/api/market-intelligence/news`, `/api/integrations/news` | Feed, media and news routes need Supabase implementations or an explicitly retained service. |
| Inspection request | Shared helper targets `/api/inspections/*` | Legacy request/agent/admin/payment/evidence route contracts must be mapped to the new inspection functions. |
| Workforce dashboard | `/api/auth/me` | Auth/profile compatibility must be tested. |
| Partnership application | `/api/partnerships` | Public email submission still depends on Railway unless a separate Vercel function owns it. |

## Confirmed frontend/backend route mismatch

**Trade Feed publishing currently calls the wrong route.**

- Before the follow-up fix, `trade-feed.html` posted to `POST /api/marketplace/feed`.
- Express mounts that route to `rejectPublicFeedPost`, which deliberately returns HTTP 403 `PUBLIC_FEED_READ_ONLY`.
- The authenticated create route is `POST /api/marketplace/feed/account`, protected by `requireAuth` and handled by `createFeedPost`.
- The Buyer Dashboard already posts to `/api/marketplace/feed/account`.

This was a real source-level mismatch, not a Supabase migration issue. **Resolved in main commit `257076b614f90345ae5d8ab99aac015321b663f6`:** Trade Feed now posts to `/api/marketplace/feed/account`. GitHub Actions run `41943629915` completed successfully. This verifies the repository test suite, not a live authenticated publish against production.

## API route contracts that must be kept intact

- Buyer order/LC pages expect `orders` and `lettersOfCredit` response arrays and existing field names such as `reference`, `total_amount_usd`, `supplier_name`, `origin_port` and `destination_port`.
- Buyer quote UI expects `quote`/quote-list fields and the legacy `status` and `convert-to-order` operations.
- Inspection pages expect `requests`, `evidence`, `agent` queue operations and payment initialization/download endpoints.
- Document upload uses `multipart/form-data`; a replacement must preserve secure file upload and download behavior rather than accepting a client-supplied arbitrary storage URL.
- Agent workspace depends on the legacy agent profile and stats API in addition to inspection workflow.
- Public trade-feed reading and authenticated feed publishing are deliberately different routes; do not make feed publishing public to work around the mismatch.

## Next audit actions

1. Scan the remaining dashboard scripts and page files for every `/api/*` call and build a machine-checkable endpoint inventory.
2. Compare frontend request bodies and expected response fields with the Express controllers and Supabase functions.
3. Trade Feed publish mismatch fixed and CI passed; still verify a live authenticated publish after a deploy.
4. Build contract tests for each frontend-used route before migrating its Vercel rewrite.


## Follow-up dashboard-script inventory (2026-11-05)

A second pass inspected the trade-workspace scripts and admin/bank support scripts on current `main` at `257076b614f90345ae5d8ab99aac015321b663f6`. It confirms these additional frontend route dependencies:

| Frontend script | API dependencies observed | Notes |
|---|---|---|
| `buyer-trade-os.js` | `/api/products`, `/api/quotes`, `/api/marketplace/enquiries`, `/api/orders`, `/api/marketplace/enquiries/mine`, `/api/shipments/atlas`, `/api/notifications` | Buyer workspace directly depends on catalogue, quote creation, enquiries, orders, shipments and notifications. |
| `supplier-trade-os.js` | `/api/quotes`, `/api/orders`, `/api/products/mine`, `/api/shipments/atlas`, `/api/marketplace/enquiries/mine`, `/api/messages`, `/api/products`, `/api/shipments/order/*`, `/api/shipments/*/events`, `/api/shipments/*/status`, `/api/auth/me` | Supplier lifecycle includes quote response, product CRUD, messaging and shipment updates. Verify each mutation is supplier-scoped. |
| `buyer-trade-room.js` | `/api/quotes/*/convert-to-order`, `/api/orders/*`, `/api/documents/order/*`, `/api/shipments/order/*`, `/api/payments`, `/api/payments/*/status`, `/api/documents/*/download`, `/api/shipments/*/live-tracking`, `/api/messages`, `/api/inspections/requests` | Buyer trade room expects end-to-end conversion, secure docs, payments, shipment tracking, messaging and inspection request contracts. |
| `bank-trade-os.js`, `bank-trade-room.js` | `/api/lc`, `/api/orders`, `/api/payments`, `/api/documents/order/*`, `/api/lc/*/issue`, `/api/lc/*/verify-and-pay`, `/api/payments/*/status`, `/api/payments/reconciliation`, `/api/auth/me` | Bank UI relies on LC issue/verification, payment/reconciliation and order/document reads. High-risk operations require bank-role and record-level authorization. |
| `buyer-communication.js` | `/api/messages`, `/api/messages/*` | Message rooms and thread operations need user/participant isolation. |
| `vtg-finance-centre.js` | `/api/orders`, `/api/payments`, `/api/payments/summary`, `/api/payments/*`, `/api/payments/reconciliation`, `/api/lc`, `/api/auth/me` | Finance centre depends on ledger/summary/reconciliation as well as payment lifecycle. |
| `admin-network.js` | `/api/network/relationships`, `/api/network/relationships/*/status` | Admin relationship status mutations need explicit admin checks and audit events. |
| `admin-trade-control.js` | `/api/admin/payment-providers`, `/api/admin/trade/overview`, `/api/admin/trade/operations`, `/api/payments/ledger`, `/api/payments/*/reconciliation` | Admin trade operations and payment ledger are not covered by the current narrow parity baseline. |
| `admin-trust-risk.js` | `/api/admin/trust-risk-flags`, `/api/admin/trust-risk-flags/*`, `/api/admin/users` | Admin risk flag review and user access must be role-gated and auditable. |
| `admin-verification-centre.js` | `/api/verification/documents/*/review`, `/api/verification/documents/*/download`, `/api/admin/dashboard`, `/api/admin/users`, `/api/verification/review-queue` | Preserve private document access and review authorization; do not expose verification files through public URLs. |
| `bank-audit-centre.js` | `/api/audit/mine`, `/api/notifications`, `/api/auth/me` | Audit records must remain scoped to the authenticated bank user/organization. |
| `bank-compliance-risk.js` | `/api/lc`, `/api/orders`, `/api/notifications`, `/api/documents/order/*`, `/api/auth/me` | Compliance UI reads LC/order/document evidence and notifications. |
| `trade-feed.html` | `/api/marketplace/feed`, `/api/marketplace/feed/account`, `/api/marketplace/feed/*/comments`, `/api/marketplace/feed/*/reactions`, `/api/media/feed/*`, `/api/market-intelligence/news`, `/api/integrations/news` | Public feed read and authenticated account publish are now distinct. Authenticated publishing route fix is on main and CI passed. |

### Key integration observations

1. The buyer/supplier/bank workspace scripts use a shared `/api` prefix and legacy Express contracts. Passing unit tests does not establish that all these routes exist in Supabase or that the response payloads match.
2. The highest-risk uncovered workflows remain quote-to-order conversion, order state changes, LC issue/verification, payments/reconciliation, private trade-document downloads, and shipment event/status/live-tracking operations.
3. The bank and admin pages call privileged endpoints. Implementations must check the caller's role and the target organization/record on the server; hiding UI controls is not authorization.
4. Shipment, message and document endpoints contain dynamic path segments. Contract tests must include cross-account access-denial cases, not only happy-path tests.
5. This follow-up was a static source inventory. It did not execute authenticated browser flows or prove a live production request.

## Recommended next implementation/test sequence

1. Build a route contract matrix for quote create/respond/convert and order create/read/update, including request/response shapes from the frontend and Express controllers.
2. Add Supabase-backed implementations only after the matching database tables/RLS and role/ownership rules are verified.
3. Add positive and negative integration tests for buyer, supplier, bank and admin roles, including cross-organization access attempts.
4. Repeat the same contract mapping for LC/payment/reconciliation, then documents and shipment events/tracking.
5. Keep the Vercel `/api/*` rewrite on Railway until each route used by the live frontend has a tested Supabase implementation or an explicitly documented alternative owner.
