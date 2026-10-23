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
- [~] `frontend-v3.html` — landing-page redesign and CSS placement/contrast fixes are already committed; verify hero artwork, 36-category carousel, 3-second rotation, links and responsive layout.
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
- [~] `buyer-dashboard.html` — workspace hierarchy, theme contrast, live feature states and navigation.
- [~] `supplier-dashboard.html` — supplier operations, shipment/evidence views and navigation.
- [~] `bank-trade-os.html` — finance workspace, LC/payment/risk information and Atlas entry points.
- [~] `admin-dashboard-preview.html`, `agent-dashboard.html`, `agent-network-dashboard.html`, `workforce-dashboard.html` — shared dashboard typography and control polish applied; responsive and role-flow testing pending.
- [~] `inspection-admin.html` — styling pass applied; admin API and payment-state testing pending.
- [~] `vtg-ai-dashboard.html` — shared dashboard typography and control polish applied; chat workflow testing pending.
- [~] `account-trade-feed.html` — authenticated feed styling pass applied; posting/reaction tests pending.
- [~] `inspection-request.html`, `inspection-payment-callback.html` — styling pass applied; request/payment end-to-end tests pending.

### Authentication, onboarding and account
- [~] `signin.html` — styling pass applied; remaining authentication pages still queued.
- [~] `signup.html` — styling pass applied; flow verification pending.
- [~] `signup-agreement.html`, `admin-signin.html`, `workforce-signin.html`, `workforce-access.html` — styling pass applied; authentication and role access testing pending.
- [~] `buyer-signup.html`, `supplier-signup.html`, `bank-signup.html` — role-specific forms preserved; visual and submission testing pending.
- [~] `account-help.html`, `contact.html` — styling pass applied; form/action verification pending.
- [~] `partnership-application.html` — styling pass applied; form submission still needs verification.

### Company, partnerships and legal
- [~] `about-vintage.html` — editorial styling pass applied; responsive review pending.
- [~] `partnerships.html`, `partnership-finance.html`, `partnership-logistics.html` — styling pass applied; responsive and link review pending.
- [~] `partnership-strategic.html`, `partnership-supply.html`, `partnership-technology.html`, `partnership-trade.html`, `partnership-warehouse.html` — shared styling pass applied; responsive review pending.
- [~] `privacy.html`, `terms.html`, `code-of-conduct.html` — long-form typography and theme contrast pass applied; content review not included.

### Minimal/utility pages
- [~] `network.html`, `agent.html` — navigation/application styling pass applied; route and submission testing pending.

## Status legend
- `[ ]` Not yet redesigned in this pass.
- `[~]` A page-specific styling pass has been committed; still needs rendered desktop/mobile, light/dark, link and interaction verification.
- `[x]` Fully verified in the rendered site.

## Status
- Shared typography/theme utilities and public navigation/theme handling already exist and should be reused rather than replaced with a second design system.
- A shared dashboard typography/control refinement is committed in `vtg-dashboard-typography.css`; eight dashboard pages now cache-bust to the updated stylesheet. Dashboard colors and workspace presets remain page-owned.

Page-specific styling passes are committed for `marketplace.html`, `supplier.html`, `trade-atlas.html`, `trade-feed.html`, `market-intelligence.html`, `vtg-ai.html`, `logistics-shipping.html`, `finance-payments.html`, `signin.html`, `sourcing-suppliers.html`, `africa-markets.html`, `product-verification.html`, `verification.html`, `trade-guide.html`, `buyer-verifications.html`, `intelligence-centre.html`, `signup.html`, `buyer-signup.html`, `supplier-signup.html`, `bank-signup.html`, `contact.html`, `account-help.html`, `about-vintage.html`, `partnerships.html`, `partnership-finance.html`, `partnership-logistics.html`, `partnership-application.html`, `partnership-strategic.html`, `partnership-supply.html`, `partnership-technology.html`, `partnership-trade.html`, `partnership-warehouse.html`, `privacy.html`, `terms.html`, and `code-of-conduct.html`, `signup-agreement.html`, `admin-signin.html`, `workforce-signin.html`, and `workforce-access.html`, `account-trade-feed.html`, `inspection-request.html`, `inspection-payment-callback.html`, `network.html`, `agent.html`, and `inspection-admin.html`.
- Static checks across all 39 page-specific files confirm balanced style tags, correct document closing, and no added CSS after `</body>`. The shared dashboard stylesheet also passes a brace-balance check, and all eight dashboard references point to its refreshed cache version.
- These are static source checks, not browser-rendering, accessibility-audit, or end-to-end interaction tests.
- Visual/browser and interaction testing is still pending; do not mark these pages complete until that testing passes.
- The latest styling commits are on the redesign branch only. A new Vercel deployment was blocked by the account's daily deployment API limit (HTTP 402, retry after 24 hours); the currently deployed preview does not include the newest page-specific changes yet.
- The repository inventory contains 54 HTML pages. All pages are now accounted for in the redesign queue: 45 have page-specific styling passes, the landing page has its existing redesign/fix pass, and eight dashboard pages receive the shared dashboard typography/control refinement.
- This is not a declaration of completion. Browser rendering, mobile layouts, light/dark presets, links, forms, API-backed workflows and role access still need end-to-end verification in batches.
