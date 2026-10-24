# VTG Site-Wide QA Status — 2026-10-24

Repository: `Temi911/vtg-backend`  
Reviewed ref: `redesign/landing-page-visual-refresh`  
Reviewed commit: `89ea435790a2f63bc37ef42a32664198c85c75ac`  
Pull request: [#16 — Complete VTG landing page visual rebuild](https://github.com/Temi911/vtg-backend/pull/16)

## Current validation summary

- GitHub Actions run [#1209](https://github.com/Temi911/vtg-backend/actions/runs/40001321472) completed successfully for the reviewed commit. The Node test suite, locked dependency installation, and clean PostgreSQL migration step all passed.
- The current Vercel preview deployment is reported as `READY`: [deployment details](https://vercel.com/olanrewajutope80-7999s-projects/vtg-backended/4PXNQHyoCgjdmMz7eQXxXazHuaSB).
- Fresh HTTP fetches against that deployment returned **200 OK** for the landing page (`/frontend-v3.html`), marketplace (`/marketplace.html`), Trade Atlas (`/trade-atlas.html`), VTG AI (`/vtg-ai.html`), supplier dashboard (`/supplier-dashboard.html`), buyer dashboard (`/buyer-dashboard.html`), bank workspace (`/bank-trade-os.html`), admin preview (`/admin-dashboard-preview.html`), and `/vtg-site-navigation.js?v=20261023-no-footer-2`.
- These checks establish successful build/test status and HTTP availability only. They do not establish that all pages render correctly or that all client-side/API-backed workflows work.

## Source audit

- [x] Enumerated the reviewed commit's Git tree: **350 tracked files, including 54 HTML pages and 171 JavaScript files**.
- [x] Parsed local `href`, `src`, and `action` references across the 54 HTML pages and compared them with tracked paths in the source audit.
- [x] Found no unresolved hard-coded local HTML-page references in the audited pages.
- [x] Found no unresolved hard-coded local asset references after accounting for runtime-generated template references and routes.
- [x] Confirmed no references to obsolete `/trade-os.html` or missing `/trade-atlas-launcher.js` in the reviewed pages.
- [x] Confirmed `/marketplace` is intentionally rewritten to `/marketplace.html` in `vercel.json`, and `/` is rewritten to `/frontend-v3.html`.
- [x] Confirmed the canonical bank workspace is `/bank-trade-os.html`. The reviewed landing/dashboard source does not reference `/bank-dashboard-preview.html` or `/map-enhancer.js`; their absence is not evidence of a broken inbound link.
- [x] Confirmed the latest commit changed this QA report only; the page source audited in its parent commit remains unchanged.

## Remaining acceptance checks

- [ ] Rendered desktop and mobile review across the site, including responsive layout and image cropping.
- [ ] Public visitor theme presets and light/dark contrast checks across public pages.
- [ ] Dashboard theme, language, navigation, and role-flow checks.
- [ ] Landing hero, all 36 marketplace categories, carousel rotation timing, and CTA interaction checks.
- [ ] Supplier, buyer, and bank dashboard direct-preview checks with actual controls exercised.
- [ ] Trade Atlas map tiles, selected coordinates, route selection, and mobile controls.
- [ ] Browser-console errors, missing network assets, keyboard navigation, and accessibility checks.
- [ ] Authentication, API health, database, storage, email, and role-ownership checks.
- [ ] End-to-end inspection/payment, letter-of-credit, document, and shipment acceptance tests.
- [ ] Production deployment and regression verification after explicit approval.

## Known verification limitation

The connected browser-control tool cannot access the originating browser context in this session. Therefore rendered visual, console, mobile, and end-to-end browser checks remain open. The Vercel preview is reachable through HTTP fetch and the selected routes above return 200, but that is not a substitute for interactive browser acceptance testing.

## Release guardrails

- Production `main` was not changed.
- Railway was not changed.
- No page was deleted; existing landing-page links and carousels remain protected during QA.
- Do not merge or promote this redesign to production until the remaining acceptance checks pass and the user explicitly approves release.

## Atlas and theme consistency fixes — 2026-10-24

- Limited the shared public appearance selector to the landing page. Interior public pages inherit the persisted landing-page appearance preference and do not offer a second theme selector; dashboard appearance controls remain dashboard-owned.
- Added light-mode contrast and background overrides for the Trade Atlas 3D globe stage, its labels, controls, legend, selected-location panel and map tiles.
- Added shared-theme styling to the buyer Atlas map, workspace Atlas drawer and dashboard shipment-globe panel. Dark mode uses dark surrounding surfaces and a darkened map-tile treatment; light mode uses a bright map stage and readable labels.
- Audited the active Atlas source files: the public Trade Atlas uses Globe.gl plus Leaflet/OpenStreetMap; workspace and buyer maps use public OpenStreetMap tiles. These implementations do not require a paid map API key. If an API-key prompt still appears, verify the exact page/deployment and clear stale browser cache; the active map source may not be the source currently being rendered.
- Verification limitation: Vercel reports the latest preview deployment as READY, but the connected preview-fetch tool cannot access that deployment alias in this session. Interactive visual verification remains open. The most recent Node test run was cancelled during rapid branch updates, so the final commit must complete CI before acceptance.
