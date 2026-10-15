# VTG Phase 3 — Authentication & Account Management Audit

Status: **Implementation and the isolated backend regression suite are complete on the dependent review branch; database-backed and authenticated browser checks remain outstanding; not signed off**

Baseline: `main` at `972960fe9ee235b05953f0a1fcca8cf01db2cfa3`
Review branch: `phase4/buyer-trade-os` (descends from the Phase 3 review code)
Scope: registration, email verification, login, authorization token lifecycle, password recovery, and account status.

## Changes in this continuation

- Added `vtg-backend/src/db/migrations/022_auth_sessions.sql` for persisted session IDs, refresh-token SHA-256 hashes, expiry, last-use time, and revocation time. The matching table is in `vtg-backend/db/schema.sql` for local `pg-mem`.
- Refresh tokens carry a session ID. Refresh validates the stored hash and expiry under a row lock, then replaces the hash and expiry transactionally. A previously rotated token revokes that login session and receives an unauthenticated response. Simultaneous use of the same token revokes the session. The shared frontend client below serializes refresh calls through Web Locks when available; callers outside it still need to serialize.
- Added `POST /api/auth/logout`; the current sign-out controls in `buyer-dashboard.html`, `signup-agreement.html`, and `verification.html` call it before clearing browser tokens.
- Access tokens carry the session ID. `requireAuth` checks the active session and account on protected requests and loads the current role from the database. Revoked sessions and disabled accounts are rejected; role changes use the current database role.
- Password reset revokes all active sessions in the same transaction as a successful password update.
- Added `vtg-backend/src/db/migrations/023_email_verification_attempts.sql`. Verification attempts are counted per email across code reissues within a 15-minute window; five failures lock code issuance for 15 minutes. New-code requests have a 60-second per-email cooldown and cannot reset an active lockout. Codes use cryptographically secure random generation.
- Signup and login normalize email addresses by trimming and lowercasing. Signup duplicate checks, login, and password-recovery lookup compare case-insensitively to support older mixed-case records.
- The earlier agent registration INSERT correction remains on this branch: the column list matches the supplied VTG ID and marketing fields.

## Frontend refresh and access-control checks

- Added `vtg-auth-session.js` and loaded it synchronously in the document head of all 21 HTML pages with authenticated API calls or stored authentication tokens. On a same-origin protected `/api/*` request, it refreshes after a 401, retries that request once with the rotated access token, and stores both new tokens.
- Refresh calls use the browser Web Locks API to serialize rotations across same-origin tabs. Browsers without Web Locks use an in-tab single-flight fallback. Login, refresh, logout, cross-origin URLs, and unauthenticated requests are not intercepted. A failed refresh clears only the matching rejected session and does not erase a newer signed-in session.
- Added `vtg-backend/test/frontend-auth-session.test.js` covering token rotation/retry, request-body preservation, same-origin lock serialization, the in-tab fallback, excluded endpoints, rejected-session cleanup, and account-switch preservation.
- Performed a static scan of the backend route modules. Admin workspace and admin trade routes require the admin role; buyer order/payment/LC creation, supplier product/shipment operations, and bank payment/LC review operations include their intended role guards. Other authenticated routes use `requireAuth`; their ownership checks remain controller responsibilities and need runtime coverage.

## Demo-account boundary

When `ENABLE_DEMO_AUTH=true`, the three configured demo accounts continue to use signed stateless tokens because they have no database user row. Their access tokens are accepted only for the exact demo ID, email, and role; their refresh tokens are not persisted or rotated, and logout cannot revoke a demo refresh token. Keep demo authentication disabled for production accounts.

## Source checks completed

- Reviewed the auth controller, auth middleware, auth routes, password-recovery controller, JWT helper, migration runner, SQL schema, sign-in token storage, and the three explicit sign-out handlers listed above.
- Confirmed source defaults: access-token lifetime `15m`; refresh-token lifetime `30d`.
- Confirmed the migration runner applies numbered migrations in numeric order and tracks each filename in `schema_migrations`.
- Compared the new session and verification-attempt table definitions with the local fallback schema.
- Checked the current branch diff against the described code paths. These are code/source checks only.

## Verification and deployment boundary

- A repository-wide `node --check` scan passed for JavaScript sources in the isolated Node 22.23.2 sandbox (installed dependencies excluded).
- Clean `npm ci --ignore-scripts --no-audit --no-fund` passed after the review-branch lockfile repair. The full `npm test` suite passed: **14 tests, 14 passed, 0 failed**.
- Tests used the local `pg-mem` fallback because no `DATABASE_URL` was provided. Demo login used explicit test-only opt-in; SMTP delivery was stubbed or intentionally unconfigured. These tests do not apply migrations to an external database or send email.
- The backend package has no lint script; lint status is unavailable.
- Vercel preview deployment `dpl_8xFtSpMAEoSk6xUHJuKZBUxZ9vzK` reached **READY** for review commit `370f7b5a0ecf6ff37780e6947ea622a31afe28b2` with `target: null`. It is a preview. No API request was sent to this exact code preview, and no database-backed auth flow was tested.
- The earlier browser visual check covered the buyer dashboard in light and dark themes at desktop width only. It did not test token expiry, refresh, logout, signup, or authenticated backend flows.
- Migrations 022 and 023 were not applied to an external database. No credentialed database auth flow was runtime-verified.
- No Railway deployment or configuration change and no Railway API request was performed. Railway work remains deferred as requested.
- Phase 3 code remains unmerged on the dependent review branch. `main` remains at `972960fe9ee235b05953f0a1fcca8cf01db2cfa3`.
- Existing access and refresh tokens created before session IDs were introduced do not contain a session ID. After a future backend release with this middleware, those sessions will need to sign in again.


- Follow-up access check on 2026-10-15: Chrome navigation to documentation preview `dpl_AosupHDBvrqCrRudV9NkjcEa9srv` reached Vercel's login page; sign-in was not attempted. One unauthenticated, read-only `GET /api/health` returned HTTP 404 with body `{"error":{"code":"NOT_FOUND","message":"Route GET /api/health not found"}}` and response header `x-railway-edge: jfk1`. This did not verify backend health or authentication. No auth, user-data, email, or mutating endpoint was called. Because the response came through Railway infrastructure and an authorized non-production API target was not available, no further API requests were made.

## Remaining before Phase 3 sign-off

1. Apply migrations 022 and 023 to an authorized non-production backend; verify buyer, supplier, bank, and agent signup/login; wrong-code lockout and resend; refresh rotation and replay rejection; logout; password reset; disabled accounts; and role changes.
2. Browser-test the new client refresh flow and the three sign-out controls, including behavior after real token expiry, a rejected/replayed refresh token, a disabled account, and simultaneous requests from separate tabs. Current tests use mocked fetch responses and do not exercise a browser or deployed backend.
3. Check existing user data for mixed-case email duplicates before any data-normalization migration. Queries are case-insensitive, but legacy duplicate rows are not cleaned up.
4. Browser-test the resend cooldown and verification lockout with the deployed auth UI, including errors, recovery from lockout, and concurrent code requests. The IP-based auth route rate limit remains in place.
5. Define and verify an authorized administrator password-recovery process; admin accounts remain excluded from public recovery.
6. Decide and verify cleanup/retention for expired and revoked session rows.
7. Confirm demo authentication stays disabled in production and test demo login/refresh/logout only in a safe environment where the flag is intentionally enabled.
8. Verify actual email delivery with an authorized non-production SMTP provider and an end-to-end verification signup flow.
