# VTG Page-by-Page Redesign Audit

Branch: `redesign/landing-page-visual-refresh`
Scope: preserve existing routes, business logic, role journeys, and integrations while improving premium visual quality, responsive layout, accessibility, and light/dark readability.

## Design contract
- Brand: VTG — The Private Trade House.
- Core palette: obsidian `#17191B`, warm ivory `#F3EFE6`, oxblood `#702A30`, muted brass `#B49A70`; use brighter imagery and generous whitespace where appropriate.
- Keep landing page carousels and all existing working links/features.
- Public pages use the shared public shell; dashboards retain their own workspace controls and identity.
- Do not call a page complete until its layout, responsive states, light/dark states, routes, and key interactions have been checked.
- Production `main` is not changed as part of this redesign pass.

## Page inventory and redesign queue

### Core entry and discovery
- [ ] `frontend-v3.html` — landing page; correct CSS placement, CTA/card contrast, validate carousel and responsive layout.
- [ ] `marketplace.html` — product discovery, search, filters, listing cards, empty/error states.
- [ ] `supplier.html` — supplier profile, credibility/evidence presentation, contact journey.
- [ ] `sourcing-suppliers.html` — supplier discovery and sourcing journey.
- [ ] `trade-atlas.html` — Atlas map/globe, route hierarchy, map controls and responsive states.
- [ ] `trade-feed.html` — public read/like/follow presentation and mobile feed layout.
- [ ] `market-intelligence.html` — intelligence cards, news density, responsive data display.
- [ ] `intelligence-centre.html` — specialist intelligence workspace and data readability.
- [ ] `vtg-ai.html` — public AI preview, clear preview-only boundaries and CTA.
- [ ] `product-verification.html`, `verification.html`, `buyer-verifications.html` — evidence, status, report and request flows.
- [ ] `logistics-shipping.html`, `finance-payments.html`, `africa-markets.html`, `trade-guide.html` — feature-specific layouts and information hierarchy.

### Workspaces and operations
- [ ] `buyer-dashboard.html` — workspace hierarchy, theme contrast, live feature states and navigation.
- [ ] `supplier-dashboard.html` — supplier operations, shipment/evidence views and navigation.
- [ ] `bank-trade-os.html` — finance workspace, LC/payment/risk information and Atlas entry points.
- [ ] `admin-dashboard-preview.html`, `inspection-admin.html`, `agent-dashboard.html`, `agent-network-dashboard.html`, `workforce-dashboard.html` — operational dashboards, responsive data tables and action states.
- [ ] `vtg-ai-dashboard.html`, `account-trade-feed.html` — authenticated AI/feed experiences.
- [ ] `inspection-request.html`, `inspection-payment-callback.html` — inspection request/payment states.

### Authentication, onboarding and account
- [ ] `signin.html`, `signup.html`, `signup-agreement.html`, `admin-signin.html`, `workforce-signin.html`, `workforce-access.html`.
- [ ] `buyer-signup.html`, `supplier-signup.html`, `bank-signup.html`.
- [ ] `account-help.html`, `contact.html`, `partnership-application.html`.

### Company, partnerships and legal
- [ ] `about-vintage.html`, `partnerships.html`, `partnership-finance.html`, `partnership-logistics.html`, `partnership-strategic.html`, `partnership-supply.html`, `partnership-technology.html`, `partnership-trade.html`, `partnership-warehouse.html`.
- [ ] `privacy.html`, `terms.html`, `code-of-conduct.html`.

### Minimal/utility pages
- [ ] `network.html`, `agent.html`.

## Status
- Shared typography/theme utilities and public navigation/theme handling already exist and should be reused rather than replaced with a second design system.
- Latest CSS-document-closing fix is deployed to the redesign preview.
- The inventory is not a claim that every page has been individually redesigned or visually tested. Each group must be worked through and verified in batches.
