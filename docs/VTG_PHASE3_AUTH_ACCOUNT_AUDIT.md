# VTG Phase 3 — Authentication & Account Management Audit

Status: **Implementation added on the review branch; pending runtime verification; not signed off**

Baseline: `main` at `972960fe9ee235b05953f0a1fcca8cf01db2cfa3`
Working branch: `phase3/auth-account-management`
Scope: registration, email verification, login, authorization token lifecycle, password recovery, and account status.

## Changes in this continuation

- Added `vtg-backend/src/db/migrations/022_auth_sessions.sql` for persisted session IDs, refresh-token SHA-256 hashes, expiry, last-use time, and revocation time. The matching table is in `vtg-backend/db/schema.sql` for local `pg-mem`.
- Refresh tokens carry a session ID. Refresh validates the stored hash and expiry under a row lock, then replaces the hash and expiry transactionally. A previously rotated token revokes that login session and receives an unauthenticated response. Clients should serialize refresh calls because simultaneous use of the same token revokes the session.
- Added `POST /api/auth/logout`; the current sign-out controls in `buyer-dashboard.html`, `signup-agreement.html`, and `verification.html` call it before clearing browser tokens.
- Access tokens carry the session ID. `requireAuth` checks the active session and account on protected requests and loads the current role from the database. Revoked sessions and disabled accounts are rejected; role changes use the current database role.
- Password reset revokes all active sessions in the same transaction as a successful password update.
- Added `vtg-backend/src/db/migrations/023_email_verification_attempts.sql`. Verification attempts now count incorrect codes and lock a code after five failures; issuing a new code resets the counter. Codes use cryptographically secure random generation.
- Signup and login normalize email addresses by trimming and lowercasing. Signup duplicate checks, login, and password-recovery lookup compare case-insensitively to support older mixed-case records.
- The earlier agent registration INSERT correction remains on this branch: the column list matches the supplied VTG ID and marketing fields.

## Demo-account boundary

When `ENABLE_DEMO_AUTH=true`, the three configured demo accounts continue to use signed stateless tokens because they have no database user row. Their access tokens are accepted only for the exact demo ID, email, and role; their refresh tokens are not persisted or rotated, and logout cannot revoke a demo refresh token. Keep demo authentication disabled for production accounts.

## Source checks completed

- Reviewed the auth controller, auth middleware, auth routes, password-recovery controller, JWT helper, migration runner, SQL schema, sign-in token storage, and the three explicit sign-out handlers listed above.
- Confirmed source defaults: access-token lifetime `15m`; refresh-token lifetime `30d`.
- Confirmed the migration runner applies numbered migrations in numeric order and tracks each filename in `schema_migrations`.
- Compared the new session and verification-attempt table definitions with the local fallback schema.
- Checked the current branch diff against the described code paths. These are code/source checks only.

## Verification and deployment boundary

- No automated tests, lint, browser interaction, visual review, or credentialed authentication flow was run.
- The new migrations have not been applied to a database, and no authenticated API flow has been runtime-verified.
- Vercel reports the GitHub-triggered branch deployment for code commit `985d231d235b25a6af2149a4160c3ee26014342b` as **READY**. This confirms the branch build/deployment completed; it does not confirm authentication against a database.
- No Railway deployment or configuration was changed. Railway work remains deferred as requested.
- Changes remain on `phase3/auth-account-management`; nothing has been merged to `main`.
- Existing access and refresh tokens created before session IDs were introduced do not contain a session ID. After a future backend release with this middleware, those sessions will need to sign in again.

## Remaining before Phase 3 sign-off

1. Run the repository's relevant automated checks and review failures.
2. Apply migrations 022 and 023 to an authorized non-production backend; verify buyer, supplier, bank, and agent signup/login; wrong-code lockout and resend; refresh rotation and replay rejection; logout; password reset; disabled accounts; and role changes.
3. Verify the production demo-auth setting and exercise demo login/refresh/logout when demo auth is intentionally enabled.
4. Review all frontend logout and token-refresh behavior in a browser. The three explicit sign-out handlers above were source-edited but not browser-tested; simultaneous refresh requests must be serialized.
5. Check existing user data for mixed-case email duplicates before any data-normalization migration. Queries are case-insensitive, but legacy duplicate rows are not cleaned up.
6. Add and verify per-email verification-code resend throttling, beyond the existing IP-based auth route rate limit.
7. Define and verify an authorized administrator password-recovery process; admin accounts remain excluded from public recovery.
8. Decide and verify cleanup/retention for expired and revoked session rows.
