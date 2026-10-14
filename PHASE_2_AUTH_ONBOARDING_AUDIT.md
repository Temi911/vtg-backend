# Phase 2 — Authentication & Onboarding

Branch: `phase-2-auth-onboarding`  
Base: `phase-1-site-stability`  
Status: CI green (14/14 tests); awaiting staging integration and rendered-browser validation.

## Work implemented

- Fixed a production backend boot blocker found in Railway logs: `marketplace.controller.js` had a corrupted duplicate tail after `module.exports`, producing `SyntaxError: Unexpected token ')'` and failing the `/health` deployment check. Removed the stray duplicate tail while preserving the complete exports and primary implementations.
- Fixed two Atlas module paths that broke the source-tree test startup while preserving compatibility with the Docker layout.
- Fixed a second startup syntax error in `market-intelligence-news.routes.js` caused by escaped quotes in a JavaScript query call.
- Fixed the agent account registration INSERT. It previously listed six user columns but supplied eight values, which would make agent signup fail at the database layer. The insert now persists the generated VTG user ID, marketing opt-in, and unsubscribe token consistently with the other registration roles.
- Normalized email addresses to trimmed lowercase during signup validation, email-code send/verify, and login validation. This aligns account creation and login with the verification service's existing email normalization.
- Added an Agent role to the sign-in role selector so agent accounts can sign in without being incorrectly treated as buyers.
- Made the sign-in page's role selector responsive: four choices on desktop and two columns on mobile.
- Corrected post-login routing: buyers go to the buyer dashboard; suppliers and banks go to the existing verification entry page; agents go to the agent dashboard. The agent role's sign-up link directs users to the public agent application page.
- Added regression checks for the agent SQL shape, email normalization, geographic signup restrictions, agreement gating, role-aware sign-in routes, and a Node syntax check for the marketplace controller.
- Added a GitHub Actions workflow to run `npm ci` and `npm test` for Phase 2 and relevant pull requests. The lockfile was synchronized with the declared dependency tree.
- Added an opt-in local verification-code fallback for development/testing only. It requires `ALLOW_LOCAL_EMAIL_VERIFICATION=true`, is disabled in production/staging, and returns the code only in `local-log` mode. Added the verification table and auth identity/marketing fields to the local fallback schema.
- Updated legacy tests to match the current landing page, explicitly configure demo credentials in the demo test, and mock SMTP rather than attempting a real network delivery.
- Follow-up auth support check found that the account-help API rejected `agent` as a role. Added `agent` to the accepted support-role list and normalized the contact email used for replies.
- Completed the public Account Help experience for Trade Agents: added the Agent role selector, locked role handling, role-specific password-reset/verification/support guidance, and agent issue choices. This fixes a front-end gap where `?role=agent` could leave the help page without matching role content.
- Added regression coverage for the Account Help Agent path.
- Added static authorization regression checks confirming that admin and agent routes use server-side role guards, document and conversation endpoints check record-level access, and order/product mutations enforce participant or supplier ownership. These are source-level regressions, not substitutes for live cross-role API tests.

## Auth and onboarding controls reviewed

- Buyer signup validates African buyer/contact countries on the server.
- Supplier signup validates China or South Korea on the server and requires business/license fields.
- Bank signup validates African countries, China, or South Korea and requires institution/regulatory fields.
- Agent account signup is restricted to China or South Korea on the server.
- Registration endpoints require a valid, unexpired email verification code before account creation.
- Workspace requests require a valid bearer token and acceptance of the current agreement, except the identity and agreement endpoints.
- Demo authentication is disabled by default and only activates when `ENABLE_DEMO_AUTH=true` and role-specific demo passwords are configured.

## Validation status

GitHub Actions completed successfully on the Phase 2 branch: **19 tests passed, 0 failed**. The latest Vercel preview is READY; all 10 auth/onboarding pages tested returned HTTP 200, non-empty HTML, and the shared navigation script. This was an HTTP/source smoke test, not a rendered-browser visual test. The tests include agent SQL and support-role regressions, email normalization, geographic restrictions, agreement gating, role-aware sign-in routes, Agent Account Help, marketplace-controller syntax, demo login, current landing-page hooks, local-only verification fallback, SMTP helper behavior, and static authorization checks for admin/agent routes, document/message access, and order/product ownership. No successful live registration, email delivery, password reset, or role-login session has been claimed.

Remaining acceptance gates:
1. Test buyer, supplier, bank, and agent signup against staging, including wrong-country rejection, duplicate email, expired/incorrect code, and missing required fields.
2. Verify real SMTP delivery, code expiry/one-time use, password recovery, agreement acceptance, and refresh-token behavior.
3. Test logged-out and cross-role workspace/API access, including record ownership checks.
4. Run desktop and mobile rendered-browser tests in light and dark themes for sign-in, signup, verification, account help, and agreement pages. HTTP smoke checks alone do not prove visual contrast or interaction correctness.
5. Deploy the repaired backend only to a safe staging environment first, then confirm Railway API health before merging. The current Railway production environment still points at `main`; its latest deployment failed, while an older deployment is still marked online. The Phase 2 branch fix has not been deployed to Railway.

## Important deployment boundary

This work is on a separate branch. It has not been merged into `main` and must not be treated as production behavior until tests and preview checks pass.
