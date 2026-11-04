# VTG Supabase backend foundation

Project reference: `lxrurbdzphqvkjprlfuv`

The Supabase project currently hosts the initial VTG relational schema and the `vtg-api` Edge Function. Database migrations are applied to the Supabase project; this folder is the repository-side source of the function and setup notes.

## Architecture

- Supabase Auth: user signup, login, JWT sessions and identity.
- PostgreSQL: profiles, buyer/supplier/bank profiles, products, trade orders, shipments, documents, supplier verification, letters of credit, conversations, messages and audit events.
- Row Level Security (RLS): ownership and participant boundaries are enforced in the database.
- Supabase Edge Functions: the first VTG API surface.
- Vercel: current public website. The production `vercel.json` rewrite still points to the old Railway host and must not be changed until the replacement routes have been tested.
- The feature branch connects sign-in and buyer/supplier/bank registration forms to Supabase Auth. Supplier and bank registrations remain buyer-level accounts until an administrator approves the requested role.

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

The live database has been provisioned and its table list, migration history, private storage buckets, and Supabase security advisor were checked. The security advisor currently reports no security lints. Before using Supabase CLI migration workflows, export/reconcile the full applied SQL into repository migration files so local, staging and production schemas can be reproduced deterministically.

## Important next steps

1. Run `SUPABASE_PUBLISHABLE_KEY=... node scripts/vtg-supabase-smoke.js` from a networked environment to test health/database connectivity, public catalogue access, and anonymous access denial.
2. Configure Supabase Auth email templates, redirect URLs and allowed site origins (including the Vercel production URL and the chosen preview URL) before testing confirmation emails.
3. Establish the first administrator securely after the owner's account is created; do not allow public signup metadata to assign privileged roles.
4. Add an integration test suite for signup, role requests, RLS boundaries, product search, order creation, messaging and document access.
5. Wire the existing website to the Supabase client on a preview branch and test each dashboard.
6. Change production routing only after preview acceptance tests pass.
7. Build remaining features: admin review UI, verification review, shipment status updates, LC bank review, audit event writes, and integrations with external logistics/banking providers.

## Secrets

Keep all server-side credentials in managed environment variables. Never commit database connection strings, JWT secrets, SMTP credentials, private API keys or service-role keys.


## Live rollout blockers (checked 2026-10-27)

- **HTTP smoke tests:** the deployed `/me` route correctly rejects anonymous access with HTTP 401. The health route returns HTTP 503 and public `/products` returns HTTP 500. PostgreSQL logs identify the catalogue cause as missing `SELECT` privileges for the `anon` role on `public.products`. The active-product RLS policy exists, but a policy alone does not grant table privileges. Apply a reviewed, least-privilege `SELECT` grant for the catalogue in the Supabase SQL Editor, then rerun the workflow at [VTG Supabase API smoke tests](https://github.com/Temi911/vtg-backend/actions/workflows/vtg-supabase-smoke.yml).
- **Auth URLs:** Supabase project dashboard > Authentication > URL Configuration. Set the Site URL to `https://vtg-backended.vercel.app`; add redirect URLs for `https://vtg-backended.vercel.app/**`, `https://vtg-staging.vercel.app/**`, `https://*-olanrewajutope80-7999s-projects.vercel.app/**`, and `http://localhost:3000/**`. Verify email confirmation is enabled and that the confirmation email template uses the configured redirect destination.
- **First administrator:** first register and confirm `vintageafricatrade@gmail.com`. Then perform a reviewed one-time bootstrap from the Supabase SQL Editor, after verifying no administrator already exists. Never assign administrator roles from public signup metadata or expose a service-role key to the browser.
- **Website integration:** the existing buyer/supplier/bank dashboards still call many legacy `/api/*` endpoints that are not yet implemented in `vtg-api`. Production routing remains on the existing target intentionally; do not switch or retire Railway until route compatibility and end-to-end tests pass.


## Authentication migration progress (2026-11-04)

The feature branch now uses Supabase Auth on the public sign-in and buyer/supplier/bank signup pages. The sign-in flow persists the Supabase session and reads the role from the RLS-protected `profiles` row. Supplier and bank signups submit a pending `role_requests` row when signup returns an active session; when email confirmation is required, the sign-in flow reads the signup's requested-role metadata and submits the pending request after the user confirms and signs in. Signup metadata is used only to create a review request, never to grant an account role. Administrator sign-in has also been moved to Supabase Auth and checks the database profile role before granting access.

**Not yet cut over:** the legacy landing-page auth modal, workforce sign-in, dashboard API calls and a number of other `/api/*` integrations still depend on the Express API contract. The Edge Function currently implements only the route list above plus limited compatibility endpoints; it is not yet a drop-in replacement for the full legacy API. Keep the Vercel Railway rewrite unchanged until route inventory, API parity, authenticated role tests, storage tests and preview acceptance are complete. Do not retire the Railway service until then.

**Email delivery:** Supabase Auth currently sends its configured confirmation email. Custom SMTP is still required before treating VTG email delivery as production-ready. Configure a dedicated VTG sender in Supabase Auth > SMTP Settings; use a Google Workspace mailbox on the VTG domain where available. Never commit the SMTP password or Google app password. A six-digit OTP requires the Supabase email template to use the `{{ .Token }}` variable and the frontend to call `verifyOtp`; the current registration screens use confirmation-link signup, not a separate pre-signup code request.


## Supabase-first rebuild policy (2026-11-04)

The migration policy is to remove the Railway dependency completely after a safe, tested cutover. If a legacy service cannot be ported directly, implement an equivalent VTG-owned service using Supabase PostgreSQL, Auth, Storage, Edge Functions and/or scheduled functions. Do not preserve a permanent Railway dependency merely because a legacy Express route has no direct equivalent. Preserve current page interfaces and request/response contracts where practical; document intentional API changes and update callers together.

### Workforce access foundation

The live Supabase database now includes:
- `vtg_workforce_members`: one or more workspace-role assignments per authenticated user, with active/suspended status.
- `vtg_workforce_invitations`: invitation records with hashed tokens, expiry, accepted/revoked/expired states and inviter identity.
- RLS: users can read their own membership; only database-verified VTG admins can manage memberships and invitations.

The workforce sign-in page now authenticates with Supabase Auth and checks for an active matching membership before opening the requested workforce workspace. The invitation lifecycle is implemented in the `workforce-invitations` Edge Function and `workforce-accept.html`. No public self-enrolment or client-side role assignment is permitted. Existing workforce dashboard data calls and session checks still need migration to Supabase.

### Remaining migration work

- **Workforce invitation lifecycle (implemented 2026-11-04):** the `workforce-invitations` Edge Function now provides admin-only invitation creation/list/revocation and authenticated email-matched acceptance. Invitations expire after seven days, use one-time records, and acceptance is transactionally serialized by a Postgres RPC. Invitation delivery uses Supabase Auth email; custom SMTP still must be configured and tested. The `workforce-accept.html` page handles acceptance. Test the complete new-user and existing-user paths before enabling workforce onboarding.
- Inventory every Express route and every frontend caller. Extend `vtg-api` or add focused Edge Functions for each required workflow; do not assume the current function is API-compatible with Express.
- Rebuild missing capabilities in Supabase where no existing counterpart exists (for example notification delivery, admin review operations, workforce administration, scheduled expiry/reminders, trade intelligence persistence, audit trails and external-service adapters).
- For third-party capabilities (maps, FX, shipping carriers, AI providers, email), Supabase owns the secure server-side adapter, secrets and persistence; the external provider remains the provider for its own live data. Never pretend Supabase itself supplies an external live-data feed.
- Migrate workforce and all buyer/supplier/bank/admin dashboard data calls, then test authorization boundaries for every role.
- Configure custom SMTP and enable leaked-password protection in Supabase Auth before production authentication sign-off.
- Keep the Vercel rewrite unchanged until the route inventory, replacement coverage, tests and preview acceptance are complete. Only then route `/api/*` to the Supabase implementation and retire Railway.



### Workforce invitation deployment record (2026-11-04)

- Supabase migration `workforce_pending_membership_lifecycle`: allows pending/active/suspended membership states and adds lookup indexes.
- Supabase migration `workforce_invitation_atomic_acceptance`: adds a service-role-only transactional acceptance RPC. It locks the invitation row, checks status/expiry/email, activates membership, and marks the invitation accepted in one transaction.
- Edge Function `workforce-invitations`: deployed ACTIVE (version 1); it verifies the caller's Supabase identity and database admin role itself. JWT gateway verification is disabled only because the handler performs explicit `auth.getUser` verification on every request.
- `workforce-accept.html`: added to the feature branch and calls the acceptance sub-route with the signed-in user's access token.
- The invitation email uses Supabase Auth's `inviteUserByEmail`; SMTP delivery and redirect URL configuration remain operational prerequisites.
- No Railway rewrite was changed and no production cutover was performed.


### Additional native Supabase services (2026-11-04)

- **Notifications:** created `public.vtg_notifications` with per-user RLS, unread index, and authenticated `vtg-notifications` Edge Function (ACTIVE v1) for listing and marking the current user's notifications read. Server-side notification producers still need to be connected to order, shipment, message and review events.
- **Administrator role reviews:** added `vtg_admin_review_role_request` transactional RPC and `vtg-admin-roles` Edge Function (ACTIVE v1). The function verifies the caller's Supabase session and database admin role, lists role requests, and processes approval/rejection. Approval provisions the supplier or bank profile and changes the account role in the same database transaction; all decisions write an audit event. End-to-end tests with a non-production admin and test requests remain required.
- **Route inventory confirmed from the Express router files:** auth, agent applications, notifications, integrations, trade intelligence, payments, wallet, inspection, compliance, audit, marketplace, verification, documents, communications, quotes, shipments and trade risk. The currently deployed `vtg-api` is not yet a complete compatibility replacement for these route families.
