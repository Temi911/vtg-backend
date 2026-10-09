# VTG Africa — Backend API

A real, working backend for the Vintage Trade Global (VTG Africa) platform:
PostgreSQL database, Express REST API, JWT authentication, and role-based
access for the three portals (Buyer / Supplier / Bank).

**This has been built and tested end-to-end** against a real PostgreSQL
database in the process of writing it — every endpoint below was actually
called and its response verified, not just written and assumed to work.

---

## 1. What's real vs. what's a stub

This backend is **real**: real database, real password hashing, real JWT
sessions, real role-based permissions, real wallet ledger with atomic
credit/debit, real order/LC/shipment/document/messaging data.

What it **cannot** do — because these aren't code problems, they're business/
legal ones — is move real money or send a real SWIFT message. Those six
payment rails (LC, T/T, Escrow, Crypto, Forex, D/P) are implemented as a
clean **provider interface** in `src/services/paymentProviders.js`. Every
provider is currently a **mock** that returns a realistic response and is
clearly commented with what a real integration would require (a bank's SWIFT/
API access, a licensed escrow partner, a licensed crypto exchange, etc). When
FGR has those partnerships in place, only that one file needs to change — no
route or controller code depends on whether a provider is mocked or real.

The one exception: `LcProvider`'s "verify & pay" step **does** perform a real
action — it credits the supplier's wallet balance in the database. That's a
deliberate choice so the rest of the app (balances, transaction history) has
something real to react to, while the actual cross-border settlement is still
mocked.

---

## 2. Stack

- **Node.js + Express** — REST API
- **PostgreSQL** (via `pg`, no ORM) — schema lives in `db/schema.sql`, plain
  parameterized SQL throughout, so it runs on any Postgres host (Neon,
  Supabase, Railway, RDS, Vercel Postgres, a plain VPS, etc.) with zero
  vendor lock-in
- **JWT** (access + refresh tokens) for auth
- **bcrypt** for password hashing
- **Zod** for request validation
- **Multer** for document uploads (local disk by default — see §6 for
  swapping to S3 for serverless deployments)
- **Helmet, CORS, rate-limiting** for baseline security

## 3. Project layout

```
vtg-backend/
├── db/
│   ├── schema.sql       ← full database schema (run once)
│   ├── seed.sql         ← forex rates + country compliance reference data
│   ├── init.js          ← applies schema.sql
│   └── seed.js          ← applies seed.sql + creates 3 demo accounts with sample data
├── src/
│   ├── config/db.js     ← pg connection pool + transaction helper
│   ├── middleware/       ← auth (JWT + role guard), error handler, file upload
│   ├── services/
│   │   ├── paymentProviders.js  ← the mock/real payment-rail abstraction (see §1)
│   │   ├── wallet.service.js    ← atomic credit/debit + ledger
│   │   └── audit.service.js     ← compliance audit trail
│   ├── controllers/      ← one file per resource (auth, orders, lc, wallet, …)
│   ├── routes/           ← one file per resource, mounted in server.js
│   └── server.js         ← app entrypoint
├── .env.example
└── package.json
```

## 4. Getting it running locally

**Prerequisites:** Node 18+, a PostgreSQL 14+ database (local or hosted).

```bash
cd vtg-backend
npm install
cp .env.example .env
# edit .env — at minimum set DATABASE_URL to your Postgres connection string
# and change JWT_ACCESS_SECRET / JWT_REFRESH_SECRET to random values
#   (generate one with: openssl rand -hex 32)

npm run db:init    # creates all tables
npm run db:seed    # creates 3 demo accounts + sample order/LC/shipment/product

npm start          # starts the API on http://localhost:4000
```

### Demo accounts (created by `npm run db:seed`)

| Role | Email | Password |
|---|---|---|
| Buyer | `buyer@demo.vtg` | `Password123` |
| Supplier | `supplier@demo.vtg` | `Password123` |
| Bank | `bank@demo.vtg` | `Password123` |

These match the sample data already shown in the frontend mockup (a
$96,000 HOPTOP dump-truck order, LC VTG-LC-2024-007, a shipment 65% of the
way from Guangzhou to Tin Can Island).

## 5. API reference (short version)

All endpoints are under `/api`. Protected routes need `Authorization: Bearer
<accessToken>`. Full request/response bodies are in the controller files —
this is just the map.

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /auth/signup/buyer` | – | Register (individual/business/dealer/NGO) |
| `POST /auth/signup/supplier` | – | Register a supplier |
| `POST /auth/signup/bank` | – | Register a bank officer |
| `POST /auth/login` | – | Login → access + refresh token |
| `POST /auth/refresh` | – | Exchange refresh token for a new access token |
| `GET /auth/me` | ✓ | Current user |
| `GET /products` | – | Browse supplier catalogue (public) |
| `POST /products` | supplier | Add a product |
| `GET /products/mine` | supplier | Your own catalogue |
| `PATCH/DELETE /products/:id` | supplier | Edit/deactivate a product |
| `POST /orders` | buyer | Create an order |
| `GET /orders` | ✓ | List your orders (role-scoped) |
| `GET /orders/:id` | ✓ | Order detail + line items |
| `PATCH /orders/:id/status` | ✓ | Advance order status |
| `POST /lc` | buyer | Request a Letter of Credit against an order |
| `GET /lc` | ✓ | List your LCs |
| `PATCH /lc/:id/issue` | bank | Issue the LC (mock SWIFT MT700) |
| `PATCH /lc/:id/docs-presented` | supplier | Mark shipping docs presented |
| `PATCH /lc/:id/verify-and-pay` | bank | Verify & release payment (mock MT103, **real** wallet credit) |
| `GET /wallet/balances` | ✓ | USD/NGN/CNY balances |
| `GET /wallet/transactions` | ✓ | Transaction ledger |
| `POST /wallet/send` | ✓ | Peer-to-peer transfer to another VTG user |
| `POST /payments` | ✓ | Initiate T/T, Escrow, Crypto, Forex, or D/P |
| `GET /payments/forex-rates` | – | Current mock FX rates |
| `POST /payments/forex/convert` | – | Convert an amount between USD/NGN/CNY |
| `GET /payments/compliance` | – | Country crypto/forex compliance table |
| `POST /documents` | ✓ | Upload a document (multipart: `file`, `docType`) |
| `GET /documents/order/:orderId` | ✓ | Documents for an order |
| `PATCH /documents/:id/verify` | bank | Approve/reject a document |
| `POST /shipments` | supplier | Create a shipment for an order |
| `GET /shipments/order/:orderId` | ✓ | Shipment + tracking timeline |
| `POST /shipments/:shipmentId/events` | supplier/bank | Add a tracking event |
| `GET /messages` | ✓ | Your conversations |
| `GET/POST /messages/:conversationId/messages` | ✓ | Read/send messages |
| `GET /compliance/audit-log` | bank | Full audit trail |
| `GET /notifications` | ✓ | Your notification feed (order/LC/shipment updates) |
| `PATCH /notifications/:id/read` | ✓ | Mark a notification as read |

Every write action also writes an entry to `audit_log` automatically.

## 6. Deploying it

The API itself is a normal Express app — deploy it anywhere that runs
Node.js (Railway, Render, Fly.io, a VPS, or as a Vercel Serverless Function
using their Node adapter). Since you're already on Vercel for the frontend,
**Railway or Render are the simplest options for the API + Postgres
together** — both give you a Postgres instance and a Node service in one
place, with a connection string you drop straight into `DATABASE_URL`.

Two things to change for a serverless deployment (e.g. if you put the API
itself on Vercel functions rather than a long-running host):

1. **File uploads** — `src/middleware/upload.js` currently writes to local
   disk, which doesn't persist on serverless. Swap the multer `storage` for
   `multer-s3` (or Vercel Blob) pointed at a real bucket.
2. **Connection pooling** — serverless functions open a lot of short-lived
   Postgres connections. Either use a pooler (Neon and Supabase both have
   one built in — use their "pooled" connection string) or put PgBouncer in
   front of a self-hosted Postgres.

For a practical end-to-end launch checklist (env vars, domains, SMTP,
acceptance tests), see `../DEPLOYMENT.md`.

## 7. Wiring the existing frontend to this API

The HTML file currently simulates everything in-browser (fake `alert()`s,
hardcoded arrays). To connect it for real, the highest-value first steps are:

1. Replace `Signup.complete(type)` with a real `fetch('/api/auth/signup/'+type, {method:'POST', body: JSON.stringify(formData)})`, store the returned `accessToken`, then call `Router.showDashboard(type)`.
2. Replace the hardcoded USD/CNY/NGN balance numbers in the wallet page with a `fetch('/api/wallet/balances')` call on page load.
3. Replace `BuyerActions.requestLC()`'s fake `Toast(...)` with a real `POST /lc`, then reload the LC list from `GET /lc`.
4. Add an `Authorization: Bearer <token>` header (from wherever you stored it after login) to every fetch call.

Happy to do this wiring pass on the HTML file directly as a next step —
just say the word.

## 8. Security notes for before this touches real users

- Change every secret in `.env` — the ones checked into `.env.example` are
  placeholders only.
- Put this behind HTTPS (Railway/Render/Vercel all do this for you
  automatically).
- Add email verification before setting `is_verified = true` for real (right
  now signup sets it to `false` and nothing currently flips it — that's
  intentionally left for you to wire up with a real email provider).
- The rate limiter is a basic in-memory one; for multi-instance deployments,
  swap to a Redis-backed store (`rate-limit-redis`).

## Production secrets

Do not commit or archive `.env` files containing real credentials. The repository intentionally keeps only `.env.example` and `.env.production.example` templates. Configure production secrets in the hosting provider's environment-variable manager.

If a credential has ever been exposed in a project archive, chat, repository, or log, rotate/revoke it at the provider before production deployment.


## Database migrations

Production schema changes are managed with numbered SQL migrations in
`src/db/migrations/`.

Run:

```bash
npm run db:migrate
```

The migration runner creates a `schema_migrations` table and applies each
migration exactly once in numeric order. The existing schema is preserved as
`001_baseline.sql`; do not edit that migration after it has been applied to a
production database. Add a new numbered migration for every future schema change.

For a new production database, run migrations before starting the API.
Do not use the legacy one-time `db:init` workflow against an existing production
database.

## Production document storage

Production file uploads must use an S3-compatible object store. Configure
`OBJECT_STORAGE_PROVIDER=s3` plus the S3 bucket, endpoint/region, and credentials
through the hosting provider's secret/environment-variable system.

The backend retains document metadata in PostgreSQL, including the storage
provider and object key. Do not commit object-storage credentials or production
`.env` files.

Run `npm run db:migrate` before deploying the updated document schema.

## Automated checks

Run:

```bash
npm test
```

The current test suite includes storage-key safety checks. Before production,
expand this into authenticated API integration tests for buyer/supplier/bank
authorization, LC state transitions, document access, wallet transactions,
signup/email verification, and payment workflows.

## Document storage migration

New document-storage primitives are available through
`src/services/document-storage.js`. Controllers should use this service for
new uploads/downloads and persist `storage_provider` + `storage_key` on the
document row. Existing local files should be migrated before local storage is
removed from staging/production.
