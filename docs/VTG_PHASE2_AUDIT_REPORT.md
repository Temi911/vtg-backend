# VTG Phase 2 — Access and UI Audit Report

Status: **In progress — not accepted**

Audit refreshed: 2026-10-15 (Africa/Lagos)
Repository: `Temi911/vtg-backend`, branch `main`
Code baseline: `c25e7f0bb2f6d234674d63594663fbefd0f2ce8f`

## Phase 2 changes verified

- Contact, Privacy Policy, and Signup & Platform Agreement theme styling changes from the preceding Phase 2 commits are present on `main`.
- The forex conversion endpoint is protected by authentication and buyer-role middleware in source: `POST /api/payments/forex/convert`.
- Fixed the account-help Contact Support email validator. It previously used a double-escaped regular expression and rejected ordinary email addresses. The corrected source is live at `/account-help.html`.
- No Railway deployment or Railway configuration was changed.

## Repository and deployment evidence

- The frontend fix is committed as `c25e7f0bb2f6d234674d63594663fbefd0f2ce8f`; the audit report refresh is a subsequent documentation-only commit on `main`.
- Vercel deployment `dpl_H6MZEQBjEsUm3obz4fPcYVjifJ7h`, for that exact commit, reached **READY** with target `production`; the `vtg-staging.vercel.app` alias is attached.
- After that deployment became READY, HTTP fetches of the 11 paths below each returned **200 OK** and `text/html; charset=utf-8`: `/`, `/signin.html`, `/account-help.html`, `/contact.html`, `/privacy.html`, `/terms.html`, `/marketplace.html`, `/admin-os.html`, `/buyer-dashboard.html`, `/supplier.html`, and `/trade-atlas.html`.
- The live `/account-help.html` response contains the corrected email pattern. This confirms deployed source delivery, not a submitted support request or end-to-end backend delivery.

## Source-level audit performed

- Enumerated 46 non-archived root HTML pages on `main`. All 46 contain a viewport meta tag. 45 include `vtg-site-navigation.js`; `account-help.html` is intentionally self-contained with its own header and a local theme-toggle handler. This is a structural scan only; it does not establish contrast or visual quality.
- Reviewed authentication middleware and selected order, payment, quote, shipment, LC, trade-document, and verification routes/controllers. Source contains authentication/role middleware and user/participant checks on the selected paths. This was not a complete endpoint-by-endpoint authorization proof.
- **Access-control issue identified:** LC issue routes require a bank role, but `lc.controller.js` allows issuance when both `letters_of_credit.issuing_bank_id` and `orders.bank_id` are null. LC request creation stores a free-text `issuing_bank_name` and does not bind a VTG bank account. A bank user who knows an LC ID may therefore pass the source-level issue check without being the named/assigned institution. This is not fixed or tested. A safe correction needs an explicit, durable bank assignment rule and must be handled with Railway changes authorized later; no backend source or Railway deployment was changed in this continuation.

## Checks still required before Phase 2 sign-off

1. Run every non-archived page in a real browser at desktop and mobile sizes, in light and dark themes; inspect contrast, layout, keyboard use, and working controls. No visual browser testing was performed in this audit.
2. Test authenticated and unauthenticated behavior for each workspace and API route across buyer, supplier, bank, agent, and admin roles.
3. Fix and retest the LC issuer-to-bank assignment gap before accepting finance access control.
4. Test cross-account access to orders, payments, quotes, shipments, trade documents, LC records, and verification files using separate accounts.
5. Run the repository test suite and build/CI checks. Tests were not run in this continuation; no automated test result is claimed.
6. Verify that demo/preview mode cannot authorize account actions and uses synthetic data only.
7. Establish which news, financial, vessel, port, customs, and FX features use live integrations versus demo/static data.
8. Complete backend/API checks only when they can be done without deploying or modifying Railway, or after Railway work is explicitly authorized.

## Acceptance rule

Do not mark Phase 2 complete until the browser, role/access, cross-account ownership, LC issuer assignment, and automated-test checks pass. HTTP 200 responses and hidden navigation links do not prove authorization or end-to-end functionality.
