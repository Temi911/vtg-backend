# VTG Phase 3 — Authentication & Account Management Audit

Status: **Started — not accepted**

Baseline: `main` at `972960fe9ee235b05953f0a1fcca8cf01db2cfa3`
Working branch: `phase3/auth-account-management`
Scope: registration, email verification, login, authorization token lifecycle, password recovery, and account status.

## Work completed in this continuation

- Source-reviewed the auth controller, account recovery controller, auth routes, auth middleware, JWT/password utilities, recovery and email-verification migrations, sign-in/signup/verification pages, and existing auth-related tests.
- Fixed the agent registration INSERT mismatch in `vtg-backend/src/controllers/auth.controller.js`: the SQL named only seven columns while supplying ten values. It now names `vtg_user_id`, `marketing_subscribed`, and `marketing_unsubscribe_token` as columns for the existing values. Without this fix, agent registration fails at the database insert.
- Fix commit: `7ed11ea3eb25145e8929df36ac0817e76dceef4c` on the working branch.

## Existing controls found in source

- Passwords use bcrypt with 12 salt rounds.
- Email verification codes are stored as SHA-256 hashes, expire after 15 minutes, and are consumed transactionally by signup.
- Password-reset tokens are generated from 32 random bytes, stored as hashes, expire after 30 minutes, and are marked used transactionally. Issuing a new recovery link invalidates prior unused links for that account.
- The auth route group has an IP-based rate limit of 30 requests per 15 minutes.
- Signup, login, and recovery code restrict or gate account creation, email verification, and reset actions in the controller source.

These are source findings only; no authentication flow was exercised against a live backend.

## Risks and work remaining

1. Refresh tokens are stateless JWTs with a 30-day default lifetime. The refresh endpoint verifies the signature and account active flag but has no persisted session/token record or rotation/replay detection. There is no logout endpoint to revoke refresh tokens.
2. `requireAuth` verifies the access-token signature but does not re-read account status or role. Disabling an account or changing its role may not affect an already issued access token until expiry.
3. Password reset updates the password and invalidates recovery links, but cannot revoke existing access or refresh JWTs.
4. Email verification codes are six digits and source review found no per-address attempt counter or lockout. The auth route IP limit is the only visible request throttling in this flow.
5. Admin password recovery is excluded from the public recovery flow. Define and verify an authorized administrative recovery process rather than enabling public admin resets.
6. Audit remaining signup roles and front-end flows, including case normalization, duplicate-account behavior, and the agent signup fix.
7. Run the repository test suite and exercise signup, verification, login, refresh, password recovery, disabled accounts, and role changes when a backend environment can be used.

## Verification and deployment boundary

- The agent INSERT correction was checked against the source field list and its eight bound parameters; tests were not run in this continuation.
- No backend runtime, credentialed account flow, or browser interaction was tested.
- The fix remains on `phase3/auth-account-management`; it is not merged to `main`.
- No Railway deployment or Railway configuration was changed. Backend runtime verification and deployment remain outside this work until Railway work is authorized.
