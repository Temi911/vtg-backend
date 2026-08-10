# VTG Staging Runbook

## Purpose

Staging must mirror production architecture while using completely separate
credentials, database, object-storage bucket, email credentials, and domains.

## Recommended topology

- Frontend: `https://staging.<your-domain>`
- API: `https://api-staging.<your-domain>`
- PostgreSQL: dedicated staging database
- Object storage: dedicated staging bucket
- SMTP: dedicated staging sender/account where possible

## Environment

Copy the variable names from `vtg-backend/.env.staging.example` into the
hosting provider's staging environment-variable/secret store. Never commit
the populated file.

Required:

- `NODE_ENV=staging`
- `DATABASE_URL`
- `DATABASE_SSL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- SMTP variables
- S3-compatible object storage variables

## Database

Run migrations against the staging database:

```bash
cd vtg-backend
npm ci
npm run db:migrate
```

Do not point staging at the production database.

## Frontend

Configure the frontend API base to:

```text
https://api-staging.<your-domain>/api
```

Do not use the production API from staging.

## Acceptance tests

1. `GET /health` returns HTTP 200.
2. Buyer signup → email verification → login.
3. Supplier signup → email verification → login.
4. Bank signup → email verification → login.
5. Buyer creates an order.
6. Supplier can access only its own order.
7. Unrelated users cannot access the order.
8. LC creation/issuance follows role and ownership rules.
9. Supplier can present only its own LC documents.
10. Bank can verify/pay only its assigned LC.
11. Wallet debit/credit remains atomic.
12. Document upload/download uses object storage.
13. Demo fallback is not used in staging.
14. Rate limits behave normally.
15. CORS rejects unapproved origins.

## Go-live gate

Do not promote to production until the staging acceptance tests pass and
production secrets/storage/database are confirmed to be separate from staging.
