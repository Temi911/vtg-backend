# VTG Supabase API Parity Audit

**Audit date:** 2026-11-05  
**Repository baseline:** `main` at `16911509500ee005baf21384d950fb908d7241da`  
**Supabase project:** `lxrurbdzphqvkjprlfuv`  
**Audit branch:** `supabase-edge-functions-baseline`

## Executive result

The migration is **not ready for production API cutover**. Vercel's current `/api/:path*` rewrite still targets the Railway backend. Keep that rewrite until every required frontend route has a tested Supabase implementation or a deliberately retained alternative.

The Express backend mounts 43 route groups. Ten Supabase Edge Functions are active, but their combined route coverage is materially smaller than the Express API surface. The current functions are a partial migration, not a drop-in replacement.

This is a static source/configuration audit plus review of recent Edge Function request logs. It is not a complete browser-driven end-to-end test. Do not treat a route as production-ready solely because a function is ACTIVE or returns HTTP 200.

## Deployed Supabase function inventory

| Function | Deployed version | Primary responsibilities seen in source |
|---|---:|---|
| `vtg-api` | 4 | Health, public product discovery, profile, products, orders, role requests, shipments, letters of credit, conversations, messages, trade documents |
| `vtg-trade-operations` | 1 | Trade quotes and shipment events |
| `vtg-notifications` | 1 | User notifications |
| `vtg-admin-roles` | 5 | Admin role-request review |
| `vtg-verification` | 6 | Business verification documents, storage and admin review |
| `vtg-inspection-workflow` | 3 | Inspection pricing, requests, assignment, evidence and decisions |
| `vtg-inspection-payments` | 2 | Paystack inspection payment initialization and verification |
| `vtg-finance-inspections` | 1 | Payment intents and inspection request reads/creation |
| `vtg-wallet` | 1 | Wallet balances, ledger and internal wallet transfers |
| `workforce-invitations` | 2 | Admin workforce invitations, revocation and invitation acceptance |

All ten deployed functions currently use `verify_jwt=false`. Reviewed handlers manually validate bearer tokens with Supabase Auth. This remains a security-sensitive configuration: every handler must preserve its manual authentication and authorization checks.

## Express API route registry and parity

Legend: **Partial** = some related functionality exists, but not the whole route contract. **Missing** = no matching implementation found in the ten-function inventory. **Alternative** = likely static/client/Vercel-owned; confirm before cutover. **Present, limited** = narrower endpoint exists; full compatibility is unproven.

| Express route group | Existing backend capability | Supabase status |
|---|---|---|
| `/auth` | Buyer/supplier/bank/agent signup, login, refresh, email codes, recovery, agreements | **Partial** — Supabase Auth pages and profile trigger exist; email delivery and all legacy response contracts still need tests |
| `/agent` | Agent profile, stats, status review | **Missing** |
| `/agent/applications` | Public agent application with documents and email delivery | **Missing** |
| `/inspections` | Buyer requests, agent queue/evidence, buyer decisions, admin assignment and payouts | **Partial** — new inspection workflow covers core requests/evidence; payout and full legacy parity unconfirmed |
| `/verification` | Supplier/bank/agent document upload and admin review | **Partial / strong overlap** — `vtg-verification` covers core document lifecycle; compare all legacy document metadata and response formats |
| `/profile` | Private profile, profile image/logo, public profile | **Partial** — basic profile endpoint exists; media and profile update routes not fully mapped |
| `/products` | Public catalogue, supplier CRUD | **Partial** — public list/create are present; supplier list/update/delete and product media need mapping |
| `/orders` | Buyer order creation, listing, detail, status update | **Partial** — list/create present in `vtg-api`; detail/status updates and all order rules need implementation |
| `/quotes` | Quote creation, listing, detail, status, convert to order | **Partial** — `vtg-trade-operations` covers basic quote list/create/respond, not full legacy lifecycle |
| `/lc` | LC request, issue, document presentation, bank verification/payment | **Partial** — LC list/create only confirmed in `vtg-api` |
| `/wallet` | Balances, transactions, transfer | **Partial / strong overlap** — balances, ledger and transfer exist; compare transaction contract and role restrictions |
| `/payments` | Payment initiation, list, summary, ledger, reconciliation, status, forex conversion | **Partial** — payment intents and inspection payments exist; general payment/reconciliation/forex parity missing |
| `/documents` | Upload, order document listing, download, bank verification | **Partial** — order document operations exist in `vtg-api`; upload, download and bank verification need mapping |
| `/trade-documents` | Order checklist, initialize compliance, update case, review document | **Partial** — basic document list/create exists; compliance lifecycle missing |
| `/shipments` | Create, atlas, live tracking, customs, delivery, vessel, order lookup, events | **Partial** — basic shipment reads and event history/write exist; customs, delivery, vessel and live tracking missing |
| `/messages` | Conversation list, message list, send | **Partial** — basic conversations/messages exist; unread counts and full participant/read-state behavior need tests |
| `/compliance` | Bank/admin audit log | **Missing** |
| `/notifications` | List and mark read | **Present, limited** — list/update own notification supported |
| `/preferences` | User preferences and language | **Missing** |
| `/location` | Share/read user location | **Missing** |
| `/communications` | Conversation rooms, invite links, group messaging | **Missing** |
| `/i18n` | Translation configuration | **Alternative** — likely static/client configuration; confirm frontend use |
| `/trade` | Trade calculations, landed cost, Nigeria sources | **Missing / alternative** — some calculations may be client-side; verify exact callers |
| `/marketplace` | Feed, storefronts, reactions, comments, follows, enquiries, support, calls | **Missing** |
| `/media` | Product, storefront, feed media uploads | **Missing** |
| `/storefront-admin` | Storefront management, links, public profiles and media | **Missing** |
| `/market` | News image and AI image helpers | **Alternative** — public helper endpoints; determine whether Vercel functions or static assets own them |
| `/atlas` | Locations, corridors and trade summary | **Missing / alternative** — static data may be appropriate; verify frontend integration |
| `/audit` | User audit history | **Missing** |
| `/admin` | Admin dashboard, user list, payment providers | **Partial** — role-request administration exists; general admin endpoints missing |
| `/admin/trade` | Trade overview, orders, LCs and operations | **Missing** |
| `/network` | Directory, relationships, partner performance and review | **Missing** |
| `/integrations` | FX, vessel, news and integration health | **Missing / alternative** — identify external data providers and client-side fallbacks |
| `/shipment-events` | Shipment event list and append | **Present, limited** — `vtg-trade-operations` implements event list/create; verify participant and event validation |
| `/trade-risk` | Order scan, portfolio, actions and admin automation | **Missing** |
| `/admin/trust-risk-flags` | Admin trust/risk flags | **Missing** |
| `/partnerships` | Public partnership application and email delivery | **Missing** |
| `/market-intelligence/trade` | Trade intelligence | **Missing / alternative** |
| `/market-intelligence/tools` | Landed cost and trade-intelligence tools | **Missing / alternative** |
| `/market-intelligence` | News feed and admin moderation/sync | **Missing / alternative** |
| `/ai-assistant` | AI status/chat | **Alternative** — repository also contains Vercel AI function files; confirm deployment precedence and secrets |
| `/visual-search` | AI product photo recognition | **Alternative** — repository contains a Vercel API handler; confirm it is deployed and configured |
| `/africa` | Africa market data | **Missing / alternative** — may be static/read-only; verify callers |

## Confirmed implementation details and issues

1. **Production routing:** `vercel.json` still rewrites `/api/:path*` to `https://vtg-backend-production-ab20.up.railway.app/api/:path*`. This must remain until parity tests pass.
2. **Duplicate product handler:** `vtg-api` has a public products GET branch before authentication and a duplicate products GET branch after authentication. The second branch is unreachable and should be removed during a reviewed cleanup.
3. **Agent role-request mismatch:** legacy signup supports agent applications. The `vtg-api` role-request POST branch currently supports supplier/bank only, while the Supabase signup trigger supports agent role requests. Align API contract and UI flow.
4. **Shipment event route:** `vtg-trade-operations` contains real event list/create operations. The `vtg-api` shipment list must not be mistaken for full shipment tracking parity.
5. **Messaging:** basic conversation/message endpoints exist, but the older UI and backend may rely on room invites, read state, unread counts and additional participant semantics.
6. **Inspection workflow:** the new workflow has explicit admin and inspector checks for pricing, queue, assignment, evidence and completion. Legacy inspection payouts and payment callback semantics still need comparison.
7. **Wallet transfer:** the Edge Function validates the user session and active profile, then supplies the authenticated user's ID as sender to a service-role RPC. The database transfer function validates active sender/recipient, positive amount, currency, idempotency and locks both accounts. The RPC is not executable by anon/authenticated roles. Keep the service-role key server-side only.
8. **Workforce acceptance:** the deployed function checks the invitation token hash and email before calling the database function. The matching four-argument RPC is not executable by anon/authenticated roles. Do not expose service-role credentials to the browser.
9. **Public submission endpoints:** legacy agent application and partnership submission routes send email. They need request-size limits, rate limiting, input sanitization and abuse protection before being recreated as public Edge Functions.
10. **Function logs:** recent sampled logs show health/product success and 401 responses for protected endpoints when no valid session was supplied. This is consistent with auth guards, but does not establish successful authenticated workflows.

## Cutover blockers

- Full frontend call-site inventory for all `/api/*` requests is not yet complete.
- No route-by-route contract test suite currently proves that Supabase responses match the existing frontend expectations.
- Missing workflows listed above must either be implemented in Supabase or explicitly retained as separate services.
- SMTP confirmation and password-reset delivery must be tested before declaring Auth migration complete.
- Payment provider secrets/callbacks and reconciliation must be tested in a safe test environment.
- Supplier/buyer/bank/agent permissions must be tested with representative test accounts.
- Vercel deployment of the tested commit is still blocked by the previously observed Vercel free-tier daily deployment limit; the production deployment is not on the latest CI-tested commit.

## Recommended implementation order

1. Finish frontend call-site inventory and mark every live route as required, unused, static, or Vercel-function-owned.
2. Complete high-priority core trade flows: products, orders, quotes, LC, shipments, shipment events, messages and documents.
3. Complete marketplace and company operations: storefronts, feed, enquiries, support, communications and media.
4. Complete finance and risk flows: general payments, reconciliation, forex, wallet, compliance, trust-risk and audit.
5. Complete agent/inspection workflows, workforce and partnerships.
6. Complete admin, network, integrations, intelligence and AI/visual-search ownership decisions.
7. Add contract tests and authenticated role-matrix tests for every migrated route.
8. Deploy a tested Vercel build and run live smoke tests.
9. Only then update Vercel API routing away from Railway and retire Railway after a monitored rollback window.

## Safety rule

Never remove the Railway rewrite, shut down the Railway service, or move the production `/api/*` route until all required endpoints have a verified replacement and the live smoke-test suite passes.
