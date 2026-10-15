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
- LC fail-closed authorization commit: `81f8ab9507c51bcbce0ef7e91eca14379a806882`.
- Assigned-bank compliance check commit: `2b0593ceff87e5db4ec7f1b3b74075b007c6b669`.
- Shipment event authorization commit: `b373e1c28276ff3b523290939300cb69d2b9b611`.
- Inspection order-ownership commit: `61bb431e6f226ea32ad79ee6b6af9043d030fddf`.
- Order cancellation guard commit: `c7bd594326f3f2a63e24e09ac90883f8862ecc21`.
- Updated Phase 2 findings and acceptance checklist: `21dcda74e858cc2b761afe02021248f84b395273`.
- The live shared theme/navigation JavaScript was fetched after the changes and its delivered source was checked against those fixes. This proves source delivery for that asset, not visual rendering or full page behavior.
- Across the existing audit and this continuation, all 46 non-archived root HTML pages were individually fetched from the staging site. The earlier recorded subset of 11 paths returned HTTP 200; current fetches of the remaining page paths returned page content with titles. A consolidated fresh status-code matrix for all 46 should still be recorded before final sign-off.
- GitHub's combined commit status for the audit-report update is **Vercel success**. Direct Vercel deployment inspection and current live page fetches later failed because the Vercel connector returned a deployment/alias 404, so this report does not claim an independently inspected deployment ID or current visual behavior.

## Source-level audit performed

- Enumerated 46 non-archived root HTML pages on `main`. All 46 contain a viewport meta tag. 45 include `vtg-site-navigation.js`; `account-help.html` is intentionally self-contained with its own header and local theme-toggle handler. This is a structural scan only; it does not establish contrast or visual quality.
- Reviewed authentication middleware and selected order, payment, quote, shipment, LC, trade-document, and verification routes/controllers. Source contains authentication/role middleware and user/participant checks on the selected paths. This was not a complete endpoint-by-endpoint authorization proof.
- **LC issuance authorization hardened in source:** `lc.controller.js` now fails closed with `BANK_ASSIGNMENT_REQUIRED` if neither `letters_of_credit.issuing_bank_id` nor `orders.bank_id` is assigned, and otherwise permits issuance only to that exact assigned bank account. This removes the previous path where any authenticated bank could issue an unassigned LC. The buyer's free-text `issuingBankName` is still not an account assignment; a durable bank-selection/assignment workflow must be implemented and tested. This source change is not deployed to Railway.
- **Compliance review authorization hardened in source:** `trade-documents.controller.js` now verifies that a bank role matches `orders.bank_id` before updating a trade compliance case. Admin review remains available.
- **Shipment event writes hardened in source:** `shipment-events.controller.js` now verifies the target shipment exists, requires a supplier to match the order's supplier account, and requires an agent to be assigned to an inspection request for that order before allowing the event write.
- **Inspection request ownership hardened in source:** `inspection.controller.js` now checks that an optional linked `trade_orders` record belongs to the authenticated buyer and is not delivered/cancelled before creating the request.
- **Order cancellation hardened in source:** `orders.controller.js` now restricts cancellation to the buyer or admin and blocks non-admin cancellation after shipment execution has started.

## Checks still required before Phase 2 sign-off

1. Run every non-archived page in a real browser at desktop and mobile sizes, in light and dark themes; inspect contrast, layout, keyboard use, and working controls. No visual browser testing was performed in this audit.
2. Test authenticated and unauthenticated behavior for each workspace and API route across buyer, supplier, bank, agent, and admin roles.
3. Build and test the durable bank assignment workflow for LCs, including buyer selection of an actual registered bank account, order/LC binding, and authorized bank issuance. The insecure fallback is removed, but unassigned LCs now correctly fail closed.
4. Add and run regression tests for the compliance-bank assignment guard, shipment event participant guard, inspection linked-order ownership guard, and order cancellation policy.
5. Test cross-account access to orders, payments, quotes, shipments, trade documents, LC records, and verification files using separate accounts.
6. Confirm the new GitHub Actions workflow actually runs, then fix any failures and record the result. The test suite was not run in this continuation; no automated test result is claimed.
6. Verify that demo/preview mode cannot authorize account actions and uses synthetic data only.
7. Establish which news, financial, vessel, port, customs, and FX features use live integrations versus demo/static data.
8. Complete backend/API checks only when they can be done without deploying or modifying Railway, or after Railway work is explicitly authorized. A local clone/test attempt could not run because this environment could not resolve github.com; no tests are claimed as passing.

## Acceptance rule

Do not mark Phase 2 complete until the browser, role/access, cross-account ownership, LC issuer assignment, and automated-test checks pass. HTTP responses, source presence, and hidden navigation links do not prove authorization or end-to-end functionality.


## Additional source finding — 2026-10-15

- `inspection.controller.js` no longer lets a buyer mark an inspection payment as paid by submitting their own claim when Paystack is unavailable. The endpoint now returns a provider-unavailable response until secure payment verification is configured. Source commit: `9e0ee22a748c4558e9b76ab258f20267fdc68219`. This is not a live-backend claim; Railway has not been deployed.

- `quotes.controller.js` now limits quote expiry to the buyer or admin and makes quote-to-order conversion conditional on the quote still being accepted and unconverted. A conflicting conversion throws inside the transaction so the duplicate order is rolled back. Source commit: `74c0359764e0377c2ca186602723483bae889163`. This still needs automated concurrency and authorization regression tests.

- Follow-up correction commit `2dde3820e6feed0f7176e0f4a2b66f1919e2f34e` finalizes the quote-conversion conflict guard. Both changed controller files (`quotes.controller.js` and `inspection.controller.js`) were checked for JavaScript parse errors after the latest edits; both parsed successfully. This is a syntax check only, not a runtime or database integration test.


## Regression coverage added — 2026-10-15

Added `vtg-backend/test/phase2-authorization-regression.test.js` with source-regression checks for inspection-payment self-confirmation, quote expiry/conversion guards, unassigned letters of credit, assigned-bank compliance review, shipment-event assignment, and order cancellation after shipment execution starts. These checks assert that the safeguards remain present in source; they are not substitutes for API-level, database, concurrency, or real-browser tests. The current GitHub commit-status response did not return a completed test result, so the new checks are not reported as passing.
