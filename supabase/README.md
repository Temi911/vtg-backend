# VTG Supabase backend foundation

Project reference: `lxrurbdzphqvkjprlfuv`

The Supabase project currently hosts the initial VTG relational schema and the `vtg-api` Edge Function. Database migrations are applied to the Supabase project; this folder is the repository-side source of the function and setup notes.

## Architecture

- Supabase Auth: user signup, login, JWT sessions and identity.
- PostgreSQL: profiles, buyer/supplier/bank profiles, products, trade orders, shipments, documents, supplier verification, letters of credit, conversations, messages and audit events.
- Row Level Security (RLS): ownership and participant boundaries are enforced in the database.
- Supabase Edge Functions: the first VTG API surface.
- Vercel: current public website. The production `vercel.json` rewrite still points to the old Railway host and must not be changed until the replacement routes have been tested.

## Edge Function

Function name: `vtg-api`

Base URL:
`https://lxrurbdzphqvkjprlfuv.supabase.co/functions/v1/vtg-api`

Routes currently implemented:
- `GET /health` — checks database connectivity through a lightweight query
- `GET /products?q=...` — public active product catalogue; RLS limits results to active listings
- `GET /me` — authenticated profile
- `GET|POST /products` — supplier product catalogue and create
- `GET|POST /orders` — buyer trade orders
- `GET|POST /role-requests` — buyer requests supplier or bank access; role remains buyer until an admin approves
- `GET /shipments` — shipment records visible to order participants or admins
- `GET|POST /letters-of-credit` — buyer LC requests and participant-scoped reads
- `GET|POST /conversations` — create and list conversations
- `GET|POST /messages?conversation_id=...` — participant-scoped messaging
- `POST /documents` — save metadata after an authenticated upload to private storage

The API delegates authorization to database RLS and validates the user JWT for private routes. This is an initial foundation, not yet a full banking, payment, customs or logistics integration.

All private requests require `Authorization: Bearer <Supabase access token>`. The publishable/anon key may be used by the browser; never expose a service-role key or database password in frontend code.

## Storage buckets

- `vtg-product-images` — public image reads, supplier-folder upload rules, 10 MiB limit.
- `vtg-trade-documents` — private, participant-scoped documents, 25 MiB limit.
- `vtg-supplier-verification` — private verification files, 25 MiB limit.

Storage policies restrict writes to owner-specific folders. The website must upload to a path beginning with the signed-in user's UUID and must never expose a service-role key.

## Database foundation

The live Supabase project has these migration entries:
- `vtg_core_backend_schema`
- `vtg_profile_privilege_hardening`
- `vtg_rls_policy_hardening`
- `vtg_role_requests_and_approval`
- `vtg_private_storage_buckets`
- `vtg_security_and_query_indexes`
- `vtg_public_catalogue_policy_split`

The live database has been provisioned and verified. Before using Supabase CLI migration workflows, export/reconcile the full applied SQL into repository migration files so local, staging and production schemas can be reproduced deterministically.

## Important next steps

1. Smoke-test the deployed Edge Function endpoints and auth failures from a real HTTP client.
2. Configure Supabase Auth email templates, redirect URLs and allowed site origins.
3. Establish the first administrator securely after the owner's account is created; do not allow public signup metadata to assign privileged roles.
4. Add an integration test suite for signup, role requests, RLS boundaries, product search, order creation, messaging and document access.
5. Wire the existing website to the Supabase client on a preview branch and test each dashboard.
6. Change production routing only after preview acceptance tests pass.
7. Build remaining features: admin review UI, verification review, shipment status updates, LC bank review, audit event writes, and integrations with external logistics/banking providers.

## Secrets

Keep all server-side credentials in managed environment variables. Never commit database connection strings, JWT secrets, SMTP credentials, private API keys or service-role keys.
