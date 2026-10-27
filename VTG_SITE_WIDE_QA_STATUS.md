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


## Phase 4 — Site-wide page and navigation review (2026-10-26)

### Scope and evidence
- Reviewed branch source for the 54 HTML pages and 171 JavaScript files in the 350-file repository tree at commit `e715e778e005f17332c939bbc11a7a0ee4b7c3b4`.
- Re-read the active source for the supplier, buyer, bank, and admin workspaces; Trade Atlas; marketplace; and VTG AI.
- Fetched the Vercel preview over HTTP for 13 representative routes: marketplace, Trade Atlas, VTG AI, supplier preview, buyer workspace, bank workspace, admin preview, Trade Feed, Market Intelligence, supplier profile, and buyer/supplier/bank registration. All 13 returned HTTP 200 with page titles, including `/supplier-dashboard.html?preview=1`.
- The preview fetch is HTTP-level evidence only. It does not prove JavaScript execution, successful rendering, API connectivity, or that interactive controls work.

### Findings
1. **Preview navigation remains client-side only.** The supplier preview script rewrites known Home links and blocks ordinary anchor clicks that leave the supplier preview. It does not secure the other public URLs against direct entry, and client-side event handling is not an access-control boundary. Do not share it as a confidential or access-restricted environment.
2. **Workspace source still contains landing-page destinations.** The supplier, buyer, bank, and admin HTML include links to `/frontend-v3.html`; the supplier preview script rewrites certain links at runtime when `?preview=1` is present. This behaviour still requires an interactive browser test, especially for injected footer links and non-anchor navigation.
3. **Live workspace behaviour remains unverified.** The supplier dashboard contains API-backed orders/quotes and preview-mode handling; buyer/bank dashboards also contain external script/API integrations. HTTP 200 alone does not establish that these integrations are healthy.
4. **No new broken local route was confirmed by the representative HTTP checks.** Do not treat this partial route sample as a fresh 54-page full-link audit.

### Acceptance checklist
- [x] Inventory HTML and JavaScript file counts from the current reviewed commit.
- [x] Representative HTTP availability checks for 13 key public/workspace routes.
- [x] Static review of the main workspace navigation source and supplier preview guard.
- [ ] Fresh rendered desktop/mobile review across all page groups.
- [ ] Exercise Home/Previous, dashboard navigation, forms, carousels, theme/language controls, and key API-backed actions in a real browser.
- [ ] Check browser console, failed network requests, keyboard focus, and accessibility.
- [ ] Verify backend/API health and role-based authorization for real user accounts.
- [ ] Replace client-side-only supplier preview isolation with an explicitly approved hosting/authentication boundary if the link must genuinely restrict access to the supplier workspace.

### Phase 4 disposition
This phase is **audit-in-progress, not site-wide acceptance**. The current preview returned HTTP 200 for the representative routes, but interactive browser acceptance is still blocked by unavailable browser control. No speculative page redesigns were applied. No merge to `main`, production promotion, or Railway changes were performed.


## Supplier preview isolation correction (2026-10-26)

- Added a standalone supplier preview bundle under `supplier-preview/`: an isolated `index.html`, local copies of the dashboard typography styles, shipment-globe script, shared dashboard footer script, and VTG logo assets.
- Rebased the preview page's local asset references so the bundle can be deployed with `supplier-preview` as its own Vercel project root. Added a scoped Vercel API rewrite for the existing Railway API and a route alias from `/supplier-dashboard.html` to the preview root.
- Removed the preview page's visible Home and sign-in link destinations from the isolated copy and added navigation guards for off-page links, form navigation, and `window.open` calls. These guards improve preview behaviour but are not security controls by themselves.
- Static validation: isolated HTML contains no remaining `href="/frontend-v3.html"`, `href="/signin.html"`, or root-relative CSS/JS/SVG asset references.
- **Deployment blocker:** attempted to create a separate Vercel project named `vtg-supplier-preview` in the known team, rooted at `supplier-preview`, with deployment disabled until the source bundle is ready. Vercel returned HTTP 403: project creation is not permitted for the current connection. No project was created and no shareable isolated URL exists yet.
- **Status:** source bundle prepared; true URL-level isolation is not complete until a user with Vercel project-creation permission creates the separate project (root directory `supplier-preview`) and deploys the current redesign branch. Do not share the original main-site preview as if it were isolated. No changes were made to the existing main Vercel project, production deployment, or Railway.


## Follow-up verification — 2026-10-26 (supplier preview restored)

- Supplier preview restoration commit: `33e968d454846bad6418355bedbbcb84ad1fa03e` — `Restore normal VTG supplier dashboard navigation after preview`.
- Vercel deployment `dpl_7894Phzafas77Cq74Fx6ye7tsECW` reached `READY` for this commit. Its preview alias remains on the existing `vtg-backended` project; no production deployment or Railway change was made.
- `supplier-preview/index.html` is now a minimal redirect to `/supplier-dashboard.html`, ending the temporary isolated-preview entry point without deleting the supplier dashboard or its normal source.
- Static navigation spot-check covered supplier, buyer, bank, landing, marketplace, Trade Atlas, VTG AI, shared navigation script, and supplier-preview entry page. The normal dashboards still contain their expected Home/sign-in links; the preview entry redirects to the standard supplier dashboard.
- The GitHub combined status for this commit reports the Vercel check as `success`. No GitHub Actions workflow run was returned for this commit, so do not infer that the full test suite ran.
- **Still open:** rendered browser QA, responsive/mobile review, console/network inspection, and interactive control/API checks. The connected browser-control session is unavailable for navigation in this session, and external HTTP fetching of the deployment URL could not be independently repeated here. Vercel `READY` confirms deployment status, not end-to-end acceptance.
- Phase 4 remains **audit-in-progress**. No production merge/promotion or Railway changes.


## Phase 4 follow-up verification — 2026-10-26 (live preview routes)

### Deployment checked
- Branch: `redesign/landing-page-visual-refresh`
- Latest checked preview deployment: `dpl_J1XM156wsjte9wCMt5vEdJAP7Xa2` (Vercel state `READY`)
- Commit: `583c5f5c452d1b291c701bf85fa85f35accb1a28` — `Record supplier preview restoration and current Phase 4 QA status`
- GitHub combined status: Vercel check `success`. This does not imply interactive browser acceptance or a full GitHub Actions test suite.

### Fresh HTTP route checks
- [x] `/supplier-preview/` — 200; returns the intended minimal page with meta refresh and `window.location.replace('/supplier-dashboard.html')`.
- [x] `/supplier-dashboard.html` — 200; Supplier Trade OS page returned.
- [x] `/buyer-dashboard.html` — 200.
- [x] `/bank-trade-os.html` — 200.
- [x] `/marketplace.html` — 200.
- [x] `/trade-atlas.html` — 200.
- [x] `/vtg-ai.html` — 200.
- [x] `/trade-feed.html` — 200.
- [x] `/market-intelligence.html` — 200.
- [x] `/supplier.html` — 200; this is the existing supplier profile route.
- [x] `/buyer-signup.html`, `/supplier-signup.html`, and `/bank-signup.html` — all 200.
- [!] `/supplier-profile.html` — 404. Repository search did not find this as a tracked page/reference; the existing profile page is `/supplier.html`. Treat this as a non-canonical test path unless a valid link is found pointing to it.

### Supplier restoration result
The supplier-preview entry point is restored as a redirect to the ordinary supplier dashboard on the checked branch preview deployment. This ends the temporary isolated-preview entry behaviour and returns normal dashboard navigation, including normal Home navigation. The dedicated preview URL must use the branch preview deployment; the production alias was checked separately and did not serve the preview entry at that path. Do not describe this as an access-restricted or confidential supplier-only link.

### Additional observations and limitations
- A request to `/api/health` returned JSON 404 `Application not found`. This endpoint may not be implemented at the configured backend path; this single result does not establish whether the API is healthy. Confirm the documented health route or inspect an authenticated, known API endpoint before making an API-health claim.
- Static source inspection and HTTP checks do not execute client JavaScript. Rendered desktop/mobile review, click-through testing, browser console/network inspection, keyboard/accessibility checks, and authenticated API workflows remain open because connected browser control is unavailable.
- No production promotion, merge to `main`, or Railway change was performed by this follow-up.


## Fresh Phase 4 route and asset spot-check — 2026-10-26 (continued)

### Preview URL checked
`https://vtg-backended-khskzg5mp-olanrewajutope80-7999s-projects.vercel.app`

Fresh fetches through the Vercel preview fetch service returned **HTTP 200** and the expected page title for:
- [x] `/` (rewrites to `/frontend-v3.html`)
- [x] `/frontend-v3.html`
- [x] `/supplier-preview/`
- [x] `/supplier-dashboard.html`
- [x] `/buyer-dashboard.html`
- [x] `/bank-trade-os.html`
- [x] `/marketplace.html`
- [x] `/trade-atlas.html`
- [x] `/vtg-ai.html`
- [x] `/trade-feed.html`
- [x] `/market-intelligence.html`
- [x] `/supplier.html`
- [x] `/buyer-signup.html`
- [x] `/supplier-signup.html`
- [x] `/bank-signup.html`

### Asset and endpoint spot-check
- [x] `/vtg-site-navigation.js?v=20261023-no-footer-2` — HTTP 200.
- [x] `/vtg-ui-repair.js` — HTTP 200.
- [!] `/map-enhancer.js` — HTTP 404. The earlier repository source audit found no active references to this root path, so this is not yet classified as a user-facing defect. Recheck if a current page or runtime request references it.
- [!] `/api/health` — HTTP 404 with JSON `Application not found`. This is not a valid health result unless the backend actually defines this route; API health remains unverified.

### Supplier preview restoration
The preview entry returns a small HTML page that sets a meta refresh and calls `window.location.replace('/supplier-dashboard.html')`; the ordinary supplier dashboard itself returns HTTP 200. This verifies the redirect code is present in the deployed response, but an HTTP fetch cannot execute the redirect or verify subsequent clicks.

### Limitations and next acceptance checks
These checks are HTTP/source checks, not rendered-browser acceptance. Interactive Home/Previous clicks, dashboard controls, mobile layout, theme contrast, console/network errors, keyboard/accessibility behaviour, and authenticated API workflows remain open. The connected browser tool in this session exposes tab reading but not interactive navigation/click control. A Vercel deployment-list request was denied by the connected account, so this follow-up does not claim an independent deployment-metadata refresh.

**Phase 4 remains in progress.** No production promotion, merge to `main`, or Railway change was performed.

## Phase 4 — Public navigation destination audit — 2026-10-27

### Result
Followed up the local destinations flagged by the landing page and bank dashboard source scan. The previously unmatched public links were present in the current preview deployment and returned HTTP 200:

- [x] `/africa-markets.html`
- [x] `/product-verification.html`
- [x] `/logistics-shipping.html`
- [x] `/sourcing-suppliers.html`
- [x] `/finance-payments.html`
- [x] `/trade-guide.html`
- [x] `/agent.html`
- [x] `/about-vintage.html`
- [x] `/partnerships.html`
- [x] `/contact.html`
- [x] `/workforce-access.html`
- [x] `/privacy.html`
- [x] `/terms.html`
- [x] `/code-of-conduct.html`

The unusual `/frontend-v3.html/` destination also returned HTTP 200 and served the landing page, but it appears to be a source-pattern false positive rather than a confirmed user-facing link. No route was changed based only on this result.

### Acceptance boundary
This closes the **destination-existence** portion of the public-link audit for the listed routes. It does not establish that every link is visually correct, that forms submit successfully, or that dashboard actions work. Rendered-browser navigation, mobile checks, console/network inspection and API-backed workflow checks remain outstanding. Phase 4 remains open.
