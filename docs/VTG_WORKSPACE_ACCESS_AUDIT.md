# VTG workspace access audit — working report

Branch: audit/role-access-hardening

## Change made
- POST /api/payments/forex/convert now requires a valid session and the buyer role. The exchange-rate table remains publicly readable for market-intelligence previews; conversion is treated as a buyer finance action.

## Source-reviewed controls (not a complete penetration test)
- Authentication middleware verifies bearer access tokens and requires acceptance of the current agreement for protected routes.
- LC request creation is buyer-only; LC issue and verify/pay operations are bank-only; supplier document-presentation is supplier-only.
- Product creation/update and product-media uploads are supplier-restricted.
- Administrative routes apply admin-role middleware.
- Order-linked document upload/list/download logic contains participant checks in the document controller.
- Shipment controller contains participant checks for shipment, customs, delivery, and milestone operations; these still require role-by-role integration tests against a running backend.

## Items still requiring verification before declaring completion
1. Exercise every HTML workspace and every API route as logged-out, buyer, supplier, bank, agent, and admin accounts; verify expected 401/403 responses.
2. Verify record ownership on every ID-based read, list, document download, quote status update, shipment tracking and LC read path using records belonging to a different account.
3. Check all front-end navigation, preview/demo state, responsive layouts and light/dark contrast in a browser.
4. Run project tests/build and review CI status; then verify Vercel deployment and Railway API health.
5. Verify live integration credentials/data providers before labelling rates, vessel positions, customs or financial figures as live.

## Safety notes
- Preview mode must contain only synthetic/demo data and must not authorize API calls or expose account data.
- A missing navigation link is not an access-control mechanism; backend authorization and resource ownership checks are required.
- This report records source review, not a completed end-to-end security audit. Do not describe all workspace permissions or integrations as verified until the tests above pass.
