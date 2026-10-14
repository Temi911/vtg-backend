# VTG Phase 2 — Access and UI Audit Report

Status: **In progress — not yet accepted**

Scope: public pages, role-specific workspaces, light/dark theme consistency, and API authorization.

## Changes in this branch
- Hardened the Contact VTG page's light/dark text, form, card, border, placeholder, and keyboard-focus styling.
- Aligned the Privacy Policy and Signup & Platform Agreement pages with shared theme tokens and responsive typography.
- Restricted `POST /api/payments/forex/convert` to authenticated buyer accounts. Public exchange-rate reads remain available for market-intelligence previews.
- Preserved existing page content and shared navigation scripts.

## Source-reviewed controls
- API authentication middleware validates bearer tokens and checks acceptance of the current agreement for protected routes.
- Admin routes use admin-role middleware.
- LC workflows, supplier product-management routes, and several document/shipment workflows have role checks or participant checks in their source.
- Order/payment ownership checks are present in controllers for some key transaction paths; every ID-based path still needs systematic testing.

## Validation evidence
- Vercel preview deployment served the updated Contact, Privacy, Terms, landing, sign-in, and sign-up pages with HTTP 200.
- The preview HTML contains the updated theme CSS and shared navigation script.
- This was source/HTTP validation, not a real interactive browser test. HTTP 200 does not prove visual contrast, responsive behavior, or end-to-end workflows.

## Required before Phase 2 can be marked complete
1. Test every non-archived HTML page in light and dark themes on desktop and mobile in a real browser.
2. Exercise every workspace as logged-out, buyer, supplier, bank, agent, and admin; confirm the intended 401/403 behavior.
3. Test cross-account access for orders, payments, quotations, shipments, trade documents, LC records, and verification documents.
4. Run the repository's automated tests and build/CI checks.
5. Check Vercel production/preview status and Railway API health when Railway work is authorized.
6. Confirm preview/demo mode uses only synthetic data and cannot authorize account actions.
7. Confirm which financial, news, vessel, port, customs, and FX features use live integrations versus demo/static data.

## Acceptance rule
Do not mark Phase 2 complete until the outstanding browser, API authorization, ownership, and automated-test checks pass. A hidden navigation link is not a security boundary; backend authorization and record ownership must be verified.
