# VTG Frontend API Call-Site Audit

**Date:** 2026-11-05  
**Inspected against:** `main` at `16911509500ee005baf21384d950fb908d7241da`

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

- `trade-feed.html` posts to `POST /api/marketplace/feed`.
- Express mounts that route to `rejectPublicFeedPost`, which deliberately returns HTTP 403 `PUBLIC_FEED_READ_ONLY`.
- The authenticated create route is `POST /api/marketplace/feed/account`, protected by `requireAuth` and handled by `createFeedPost`.
- The Buyer Dashboard already posts to `/api/marketplace/feed/account`.

This is a real source-level mismatch, not a Supabase migration issue. Correct the Trade Feed client to use the authenticated account route, then run the frontend flow tests and verify role-based publishing.

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
3. Fix the Trade Feed publish route mismatch in a separate tested code change.
4. Build contract tests for each frontend-used route before migrating its Vercel rewrite.
