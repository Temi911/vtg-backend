# Phase 2 — Authentication & Onboarding

Branch: `phase-2-auth-onboarding`  
Base: `phase-1-site-stability`  
Status: implementation pass started; not production-certified.

## Work implemented

- Fixed a production backend boot blocker found in Railway logs: `marketplace.controller.js` had a corrupted duplicate tail after `module.exports`, producing `SyntaxError: Unexpected token ')'` and failing the `/health` deployment check. Removed the stray duplicate tail while preserving the complete exports and primary implementations.
- Fixed the agent account registration INSERT. It previously listed six user columns but supplied eight values, which would make agent signup fail at the database layer. The insert now persists the generated VTG user ID, marketing opt-in, and unsubscribe token consistently with the other registration roles.
- Normalized email addresses to trimmed lowercase during signup validation, email-code send/verify, and login validation. This aligns account creation and login with the verification service's existing email normalization.
- Added an Agent role to the sign-in role selector so agent accounts can sign in without being incorrectly treated as buyers.
- Made the sign-in page's role selector responsive: four choices on desktop and two columns on mobile.
- Corrected post-login routing: buyers go to the buyer dashboard; suppliers and banks go to the existing verification entry page; agents go to the agent dashboard. The agent role's sign-up link directs users to the public agent application page.
- Added regression checks for the agent SQL shape, email normalization, geographic signup restrictions, agreement gating, and role-aware sign-in routes.

## Auth and onboarding controls reviewed

- Buyer signup validates African buyer/contact countries on the server.
- Supplier signup validates China or South Korea on the server and requires business/license fields.
- Bank signup validates African countries, China, or South Korea and requires institution/regulatory fields.
- Agent account signup is restricted to China or South Korea on the server.
- Registration endpoints require a valid, unexpired email verification code before account creation.
- Workspace requests require a valid bearer token and acceptance of the current agreement, except the identity and agreement endpoints.
- Demo authentication is disabled by default and only activates when `ENABLE_DEMO_AUTH=true` and role-specific demo passwords are configured.

## Validation status

Source-level JavaScript parsing passed for the edited marketplace controller, auth controller, regression test file, and both inline sign-in scripts. The regression test suite itself **has not yet been executed in a local Node runtime in this environment**. No successful live registration, email delivery, password reset, or role-login session has been claimed.

Before marking Phase 2 complete:
1. Run `npm test` in `vtg-backend/` and resolve all failures.
2. Test buyer, supplier, bank, and agent signup against staging, including wrong-country rejection, duplicate email, expired/incorrect code, and missing required fields.
3. Verify SMTP delivery, code expiry/one-time use, password recovery, agreement acceptance, and refresh-token behavior.
4. Test logged-out and cross-role workspace/API access, including record ownership checks.
5. Run desktop and mobile browser tests in light and dark themes for sign-in, signup, verification, account help, and agreement pages.
6. Deploy the repaired backend only to a safe staging environment first, then confirm Railway API health and the exact Vercel preview deployment before merging. The current Railway production environment still points at `main`; its latest deployment failed, while an older deployment is still marked online. The Phase 2 branch fix has not been deployed to Railway.

## Important deployment boundary

This work is on a separate branch. It has not been merged into `main` and must not be treated as production behavior until tests and preview checks pass.
