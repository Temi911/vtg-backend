# VTG Phase 3 — Authentication & Account Management Audit

Status: **Implementation and isolated frontend regression checks completed on the review branch; backend runtime verification pending; not signed off**

Baseline: `main` at `972960fe9ee235b05953f0a1fcca8cf01db2cfa3`
Working branch: `phase3/auth-account-management`
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

- The isolated client regression suite passed locally under Node 24: 6 tests passed, 0 failed. `node --check` also passed for the client script.
- The repository-wide `npm test` suite and lint were not run; this local mirror does not contain the repository checkout or installed project dependencies. No browser interaction, visual review, or credentialed authentication flow was run.
- The new migrations have not been applied to a database, and no authenticated API flow has been runtime-verified.
- Vercel reports the GitHub-triggered [branch deployment](https://vtg-backended-git-phase3-76bf67-olanrewajutope80-7999s-projects.vercel.app) for code commit `458bb5ec82edfdb602ab10c62a0fc01fb891902f` as **READY** (deployment `dpl_5hoAWjeYDAHLFnwyyFcCVQj1VXpo`). The deployed `vtg-auth-session.js` returned HTTP 200 and byte-matched the committed file. All 21 instrumented HTML pages returned HTTP 200 and contained the helper reference. These are static-file checks; they do not confirm authentication against a database.
- The repository's Vercel config rewrites `/api/*` to Railway production. No API request was sent from the branch deployment, so the auth flow was not exercised against Railway.
- No Railway deployment or configuration was changed. Railway work remains deferred as requested.
- Changes remain on `phase3/auth-account-management`; nothing has been merged to `main`.
- Existing access and refresh tokens created before session IDs were introduced do not contain a session ID. After a future backend release with this middleware, those sessions will need to sign in again.

## Remaining before Phase 3 sign-off

1. Run the full backend `npm test` suite and the project lint in a checkout with dependencies. Only the isolated frontend client regression file was run here; the full repository checks remain outstanding.
2. Apply migrations 022 and 023 to an authorized non-production backend; verify buyer, supplier, bank, and agent signup/login; wrong-code lockout and resend; refresh rotation and replay rejection; logout; password reset; disabled accounts; and role changes.
3. Verify the production demo-auth setting and exercise demo login/refresh/logout when demo auth is intentionally enabled.
4. Browser-test the new client refresh flow and the three sign-out controls, including behavior after real token expiry, a rejected/replayed refresh token, a disabled account, and simultaneous requests from separate tabs. The local regression tests use mocked fetch responses and do not exercise a browser or backend.
5. Check existing user data for mixed-case email duplicates before any data-normalization migration. Queries are case-insensitive, but legacy duplicate rows are not cleaned up.
6. Browser-test the new resend cooldown and verification lockout, including error messages, account recovery from a lockout, and concurrent code requests. The existing IP-based auth route rate limit remains in place.
7. Define and verify an authorized administrator password-recovery process; admin accounts remain excluded from public recovery.
8. Decide and verify cleanup/retention for expired and revoked session rows.
