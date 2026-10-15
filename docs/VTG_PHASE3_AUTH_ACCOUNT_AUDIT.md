# VTG Phase 3 — Authentication & Account Management Audit

Status: **Implementation added on the review branch; pending runtime verification; not signed off**

Baseline: `main` at `972960fe9ee235b05953f0a1fcca8cf01db2cfa3`
Working branch: `phase3/auth-account-management`
Scope: registration, email verification, login, authorization token lifecycle, password recovery, and account status.

## Changes in this continuation

- Added `vtg-backend/src/db/migrations/022_auth_sessions.sql` to persist session IDs, refresh-token SHA-256 hashes, expiry, last-use time, and revocation time. The matching table is in `vtg-backend/db/schema.sql` for the local `pg-mem` schema.
- Refresh tokens now include a session ID. Refresh validates the stored hash and expiry under a row lock, then replaces the hash and expiry in the same transaction. A previously rotated token no longer matches the stored hash, revokes that login session, and receives an unauthenticated response. Concurrent refresh requests using the same token can therefore revoke the session; clients should serialize refresh calls.
- Added `POST /api/auth/logout`; the current sign-out controls in `buyer-dashboard.html`, `signup-agreement.html`, and `verification.html` call it before clearing browser tokens.
- Access tokens now carry the session ID. `requireAuth` checks the session and active account on protected requests and loads the current role from the database, so a revoked session, disabled account, or changed role does not wait for the JWT expiry.
- Successful password resets revoke every active session in the same database transaction as the password update.
- The earlier agent registration SQL correction remains on this branch: its insert column list now matches the supplied VTG ID and marketing fields.

## Demo-account boundary

When `ENABLE_DEMO_AUTH=true`, the three configured demo accounts continue to use signed stateless tokens because they have no database user row. Their access tokens are accepted only for the exact demo ID, email, and role; their refresh tokens are not persisted or rotated, and logout cannot revoke a demo refresh token. Keep demo authentication disabled for production accounts.

## Source checks completed

- Reviewed the auth controller, auth middleware, auth routes, password-recovery controller, JWT helper, migration runner, SQL schema, sign-in token storage, and the three explicit sign-out handlers listed above.
- Confirmed source defaults: access-token lifetime `15m`; refresh-token lifetime `30d`.
- Confirmed the migration runner applies numbered migrations in numeric order and tracks each filename in `schema_migrations`.
- Checked the branch file changes against the session lifecycle described above. These are code/source checks only.

## Verification and deployment boundary

- No automated tests, lint, browser interaction, visual review, or credentialed backend flow was run in this continuation.
- The migration has not been applied to a database. The backend has not been deployed or runtime-verified.
- No Railway deployment or configuration was changed. Railway work remains deferred as requested.
- Changes remain on `phase3/auth-account-management`; nothing has been merged to `main`.
- Existing access and refresh tokens created before this change do not contain a session ID. After a future backend release with this middleware, those sessions will need to sign in again.

## Remaining before Phase 3 sign-off

1. Run the repository's relevant automated checks and review failures.
2. Apply the migration to an authorized non-production backend, then verify buyer, supplier, bank, and agent signup/login; refresh rotation and reuse rejection; logout; password reset; disabled accounts; and role changes.
3. Verify the production demo-auth setting and exercise demo login/refresh/logout when demo auth is intentionally enabled.
4. Review all frontend logout and token-refresh behavior in a browser; the three explicit sign-out handlers above were source-edited but not browser-tested.
5. Complete remaining account-flow review: email normalization and duplicate handling, verification-code attempt limits, and a documented administrator password-recovery process.
6. Decide and verify cleanup/retention for expired and revoked session rows.
