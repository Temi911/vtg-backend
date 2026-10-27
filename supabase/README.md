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
- `GET /health` — public health response
- `GET /me` — authenticated profile
- `GET /products?q=...` — active product catalogue
- `POST /products` — authenticated supplier product creation; database policies decide whether the user is authorized
- `GET /orders` — authenticated orders visible under RLS
- `POST /orders` — authenticated buyer order creation; validates product/supplier match and relies on RLS for role authorization

All private requests require `Authorization: Bearer <Supabase access token>`. The publishable/anon key may be used by the browser; never expose a service-role key or database password in frontend code.

## Important next steps

1. Finish the remaining routes (verification review, shipment updates, LC workflows, documents/storage, messaging, admin actions).
2. Create private Storage buckets and policies for trade and verification documents.
3. Configure Supabase Auth email templates, redirect URLs and allowed site origins.
4. Establish the first administrator securely after the owner's account is created; do not allow public signup metadata to assign privileged roles.
5. Add an integration test suite and test sign-up, role boundaries, product search, order creation, and mobile dashboard workflows.
6. Add the Supabase client to the existing website and change production routing only after acceptance tests pass.

## Secrets

Keep all server-side credentials in managed environment variables. Never commit database connection strings, JWT secrets, SMTP credentials, private API keys or service-role keys.
