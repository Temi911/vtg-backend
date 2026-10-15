# VTG Phase 2 — Access and UI Audit Report

Status: **In progress — not accepted**
Audit refreshed: 2026-10-15 (Africa/Lagos)
Repository: `Temi911/vtg-backend`, branch `main`

## Phase 2 changes verified

- Contact, Privacy Policy, and Signup & Platform Agreement theme styling changes from the preceding Phase 2 commits are present on `main`.
- The forex conversion endpoint is protected by authentication and buyer-role middleware in source: `POST /api/payments/forex/convert`. The change is source-only until Railway deployment is explicitly authorized.
- The account-help Contact Support email validator was corrected; ordinary email addresses are no longer rejected by the double-escaped regular expression. The corrected source is live at `/account-help.html`.
- Corrected the shared automatic theme schedule in `vtg-site-navigation.js`: light mode is now 06:00 inclusive to 18:00 exclusive; dark mode is 18:00 inclusive to 06:00 exclusive, matching `VTG_THEME_STANDARD.md`. Manual Light/Dark/Automatic preference behavior remains in the shared controller.
- Added shared neutral-card background colors for light and dark themes in `vtg-site-navigation.js`, complementing existing text, border, form-control, and link contrast rules.
- Changed shared body theme rules to set a light or dark background color without replacing page background images and gradients.
- Added `.github/workflows/vtg-backend-tests.yml` to run `npm ci` and `npm test` on pushes and pull requests to `main`. The workflow file is present, but a new run was not observed through the available GitHub Actions results; no passing test result is claimed.
- Confirmed the live `https://vtg-staging.vercel.app/vtg-site-navigation.js` response returns HTTP 200 and includes the 18:00 boundary, no longer includes the 22:00 boundary, and contains the light/dark body and neutral-surface rules.
- No Railway deployment or Railway configuration was changed.

## Repository and deployment evidence

- Theme schedule correction commit: `3359f0ee5370efc2ea0b2d4090eea4963418250e`.
- Shared card-surface contrast commit: `f7198a5d2c710948af13079b31f3ec09dfe8480a`.
- Body background preservation commit: `91d671c76076710479867cbd9332094499c39720`.
- Test workflow commit: `78abd070f83bf9f2a6eac2b0dd964593f6708ebc`.
- The live shared theme/navigation JavaScript was fetched after the changes and its delivered source was checked against those fixes. This proves source delivery for that asset, not visual rendering or full page behavior.
- Across the existing audit and this continuation, all 46 non-archived root HTML pages were individually fetched from the staging site. The earlier recorded subset of 11 paths returned HTTP 200; current fetches of the remaining page paths returned page content with titles. A consolidated fresh status-code matrix for all 46 should still be recorded before final sign-off.
- The deployment-list API call was denied by Vercel (403), so this report does not claim an independently confirmed deployment ID for the latest commits.

## Source-level audit performed

- Enumerated 46 non-archived root HTML pages on `main`. All 46 contain a viewport meta tag. 45 include `vtg-site-navigation.js`; `account-help.html` is intentionally self-contained with its own header and local theme-toggle handler. This is a structural scan only; it does not establish contrast or visual quality.
- Reviewed authentication middleware and selected order, payment, quote, shipment, LC, trade-document, and verification routes/controllers. Source contains authentication/role middleware and user/participant checks on the selected paths. This was not a complete endpoint-by-endpoint authorization proof.
- **Access-control issue identified:** LC issue routes require a bank role, but `lc.controller.js` allows issuance when both `letters_of_credit.issuing_bank_id` and `orders.bank_id` are null. LC request creation stores a free-text `issuing_bank_name` and does not bind a VTG bank account. A bank user who knows an LC ID may therefore pass the source-level issue check without being the named/assigned institution. This remains unfixed. A safe correction needs an explicit, durable bank assignment rule and must be coordinated with backend deployment work later; no LC controller or Railway changes were made in this continuation.

## Checks still required before Phase 2 sign-off

1. Run every non-archived page in a real browser at desktop and mobile sizes, in light and dark themes; inspect contrast, layout, keyboard use, and working controls. No visual browser testing was performed in this audit.
2. Test authenticated and unauthenticated behavior for each workspace and API route across buyer, supplier, bank, agent, and admin roles.
3. Fix and retest the LC issuer-to-bank assignment gap before accepting finance access control.
4. Test cross-account access to orders, payments, quotes, shipments, trade documents, LC records, and verification files using separate accounts.
5. Confirm the new GitHub Actions workflow actually runs, then fix any failures and record the result. The test suite was not run in this continuation; no automated test result is claimed.
6. Verify that demo/preview mode cannot authorize account actions and uses synthetic data only.
7. Establish which news, financial, vessel, port, customs, and FX features use live integrations versus demo/static data.
8. Complete backend/API checks only when they can be done without deploying or modifying Railway, or after Railway work is explicitly authorized.

## Acceptance rule

Do not mark Phase 2 complete until the browser, role/access, cross-account ownership, LC issuer assignment, and automated-test checks pass. HTTP responses, source presence, and hidden navigation links do not prove authorization or end-to-end functionality.
