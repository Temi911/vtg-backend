# VTG Go-Live Runbook

This guide makes the VTG frontend + backend + signup flow publicly accessible.

## 1. Architecture for launch

- Frontend host: Vercel/Netlify (serves `vtg-live-19-DEMO_1.html`)
- Backend host: Railway/Render/Fly/VPS (runs Express API)
- Database: managed PostgreSQL (Railway/Neon/Supabase/RDS)
- SMTP provider: SendGrid/Mailgun/Resend/SES (for real verification emails)

## 2. Required environment variables (backend)

Use `vtg-backend/.env.production.example` as the source of truth.

Minimum required to operate:

- `NODE_ENV=production`
- `PORT=4000`
- `DATABASE_URL=...`
- `DATABASE_SSL=true` (for managed Postgres)
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `CORS_ORIGIN=https://your-frontend-domain.com`

Required for real email verification delivery:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Without SMTP values, verification still works in local/fallback mode but does not send real email.

## 3. One-time database bootstrap

Run once against production DB:

```bash
cd vtg-backend
npm ci
npm run db:init
npm run db:seed
```

Note: `db:init` is not idempotent because schema types are created directly. Do not run it repeatedly on the same DB.

## 4. Local production-like validation with Docker Compose

The root `compose.yaml` now includes both Postgres and backend.

```bash
docker compose up --build
```

Backend health:

- `http://localhost:4000/health`

API base:

- `http://localhost:4000/api`

## 5. Frontend -> backend wiring for online access

Your frontend already uses:

- localhost: `http://localhost:4000/api`
- production default: `/api`

For separate domains, define before app scripts load:

```html
<script>
  window.VTG_API_BASE = 'https://your-backend-domain.com/api';
</script>
```

## 6. Domain and HTTPS

- Attach custom domain to frontend host (for example, `app.yourdomain.com`)
- Attach custom domain to backend host (for example, `api.yourdomain.com`)
- Ensure both are HTTPS
- Set `CORS_ORIGIN` exactly to frontend URL

## 7. Go-live acceptance checklist

- `GET /health` returns 200 from public backend URL
- Signup sends verification code by real email
- `POST /api/auth/verify-email-code` accepts valid code
- Buyer/Supplier/Bank signup succeeds after verification
- Login works and dashboard loads API-backed data
- Rate limiter behavior acceptable under normal traffic

## 8. Recommended first production hardening steps

- Change `CORS_ORIGIN` from `*` to exact domain(s)
- Rotate JWT secrets regularly
- Add managed object storage for uploads (S3-compatible)
- Add centralized logs and uptime monitoring
- Add DB backups and restore test


## Production demo-mode safety

The frontend's built-in demo fallback is restricted to `localhost` / `127.0.0.1` development.
Staging and production do not fall back to simulated data when the API is unavailable or
returns a server error. They display an API error instead.

Do not re-enable demo fallback on a public hostname. This prevents simulated orders,
wallet balances, letters of credit, payments, or authentication states from being shown
as real activity during an outage.
