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
- [~] `marketplace.html` — product discovery, search, filters, listing cards, empty/error states.
- [~] `supplier.html` — supplier profile, credibility/evidence presentation, contact journey.
- [~] `sourcing-suppliers.html` — supplier discovery and sourcing journey.
- [~] `trade-atlas.html` — Atlas map/globe, route hierarchy, map controls and responsive states.
- [~] `trade-feed.html` — public read/like/follow presentation and mobile feed layout.
- [~] `market-intelligence.html` — intelligence cards, news density, responsive data display.
- [~] `intelligence-centre.html` — specialist intelligence workspace and data readability.
- [~] `vtg-ai.html` — public AI preview, clear preview-only boundaries and CTA.
- [~] `product-verification.html`, `verification.html` — evidence, status, report and request flows; styling pass applied, interactions still need verification.
- [~] `buyer-verifications.html` — evidence, status, report and request flows.
- [~] `logistics-shipping.html`, `finance-payments.html` — feature-specific layouts and information hierarchy.
- [~] `trade-guide.html` — trade education content and information hierarchy.
- [~] `africa-markets.html` — market coverage cards, availability labels and responsive layout.

### Workspaces and operations
- [ ] `buyer-dashboard.html` — workspace hierarchy, theme contrast, live feature states and navigation.
- [ ] `supplier-dashboard.html` — supplier operations, shipment/evidence views and navigation.
- [ ] `bank-trade-os.html` — finance workspace, LC/payment/risk information and Atlas entry points.
- [ ] `admin-dashboard-preview.html`, `inspection-admin.html`, `agent-dashboard.html`, `agent-network-dashboard.html`, `workforce-dashboard.html` — operational dashboards, responsive data tables and action states.
- [ ] `vtg-ai-dashboard.html`, `account-trade-feed.html` — authenticated AI/feed experiences.
- [ ] `inspection-request.html`, `inspection-payment-callback.html` — inspection request/payment states.

### Authentication, onboarding and account
- [~] `signin.html` — styling pass applied; remaining authentication pages still queued.
- [~] `signup.html` — styling pass applied; flow verification pending.
- [ ] `signup-agreement.html`, `admin-signin.html`, `workforce-signin.html`, `workforce-access.html`.
- [~] `buyer-signup.html`, `supplier-signup.html`, `bank-signup.html` — role-specific forms preserved; visual and submission testing pending.
- [~] `account-help.html`, `contact.html` — styling pass applied; form/action verification pending.
- [ ] `partnership-application.html`.

### Company, partnerships and legal
- [~] `about-vintage.html` — editorial styling pass applied; responsive review pending.
- [ ] `partnerships.html`, `partnership-finance.html`, `partnership-logistics.html`, `partnership-strategic.html`, `partnership-supply.html`, `partnership-technology.html`, `partnership-trade.html`, `partnership-warehouse.html`.
- [ ] `privacy.html`, `terms.html`, `code-of-conduct.html`.

### Minimal/utility pages
- [ ] `network.html`, `agent.html`.

## Status legend
- `[ ]` Not yet redesigned in this pass.
- `[~]` A page-specific styling pass has been committed; still needs rendered desktop/mobile, light/dark, link and interaction verification.
- `[x]` Fully verified in the rendered site.

## Status
- Shared typography/theme utilities and public navigation/theme handling already exist and should be reused rather than replaced with a second design system.
- Page-specific styling passes are committed for `marketplace.html`, `supplier.html`, `trade-atlas.html`, `trade-feed.html`, `market-intelligence.html`, `vtg-ai.html`, `logistics-shipping.html`, `finance-payments.html`, `signin.html`, `sourcing-suppliers.html`, `africa-markets.html`, `product-verification.html`, `verification.html`, `trade-guide.html`, `buyer-verifications.html`, `intelligence-centre.html`, `signup.html`, `buyer-signup.html`, `supplier-signup.html`, `bank-signup.html`, `contact.html`, `account-help.html`, and `about-vintage.html`.
- Static checks on these twenty-three pages confirm the new style blocks are balanced and are not accidentally placed after `</body>`.
- Visual/browser and interaction testing is still pending; do not mark these pages complete until that testing passes.
- The latest styling commits are on the redesign branch only. A new Vercel deployment was blocked by the account's daily deployment API limit (HTTP 402, retry after 24 hours); the currently deployed preview does not include the newest page-specific changes yet.
- The inventory is not a claim that every page has been individually redesigned or visually tested. Remaining pages must be worked through and verified in batches.
