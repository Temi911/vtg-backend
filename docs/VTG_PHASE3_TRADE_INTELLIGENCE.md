# VTG Phase 3 — Trade Intelligence

**Status:** Source implementation complete; operational acceptance remains gated on verified external providers and browser/deployment checks. GitHub Actions test suite passed on commit `5f06e05d9554d66eb61ab33115896cf3f548c334` (22 tests, 20 passed in the prior run? See note below). No live tariff, freight, or verified FX provider is claimed.

## Goal

Use one versioned contract for intelligence shown in Trade OS, Marketplace and Trade Room. Every figure or rule must expose its status, source provenance, timestamps, assumptions and limitations. Static previews and user-entered assumptions must never be presented as live market data or official rulings.

## Initial implementation

- `vtg-backend/src/services/trade-intelligence.contract.js` defines the version `1.0` record schema and accepted record kinds: FX rates, tariff rules, country rules, freight quotes, market signals and landed-cost outputs.
- Statuses are explicit: `live`, `indicative`, `demo` or `unavailable`.
- Source provenance includes authority type, URL where available, published time, retrieval time and expiry time.
- Expired evidence is marked stale. A record is marked `isDecisionReady` only when it is live, has current expiry metadata and is attributed to an official source. This is a display/readiness signal, not a legal or commercial guarantee.
- `calculateIndicativeLandedCost` uses user-supplied goods value, freight, insurance, duty rate, VAT rate/basis and other charges. It returns component-level arithmetic, assumptions and limitations; it does not discover or certify applicable tariff rates.
- `vtg-backend/test/trade-intelligence.contract.test.js` covers required retrieval timestamps, stale-source handling, normalization and landed-cost arithmetic.
- `vtg-backend/src/routes/trade-intelligence.routes.js` adds authenticated endpoints: `GET /api/market-intelligence/tools/contract` and `POST /api/market-intelligence/tools/landed-cost/estimate`. The estimate route is limited to buyer, supplier, bank and admin roles and does not retrieve or certify tariff rates.
- `vtg-backend/src/server.js` mounts the new router under `/api/market-intelligence/tools` without modifying the protected `frontend-v3.html`.
- `intelligence-centre.html` now adds a user-entered VAT assumption, shows VAT in the local planning preview, and submits an authenticated request to the landed-cost estimate endpoint. If the server endpoint is unavailable, the page keeps the local estimate and explicitly labels the fallback rather than implying the server calculation succeeded.
- The Intelligence Centre now requests the authenticated `/contract` endpoint and displays the actual integration limitations reported by the backend: the current FX figure is a client-side indicative feed not verified by this API, and tariff/freight adapters are not connected. The UI test checks that this caveat remains visible.
- The public Market Intelligence news panel now shows the feed-provided publication/discovery timestamp, a calculated age band, source attribution, and a safe HTTP(S)-only original-source link. It explicitly states that age is not proof of accuracy and does not manufacture placeholder headlines when the feed is empty or unavailable.
- The authenticated buyer dashboard’s Market Intelligence section now checks the protected `/api/market-intelligence/tools/contract` endpoint on entry and on demand, displays the API-declared FX/tariff/freight integration status, and clearly reports preview/session/API failures as unverified. Added a source-regression test for this panel.
- Corrected the research-method card so its “Read the VTG guide” action stays on VTG’s own `/trade-guide.html` page instead of unexpectedly sending readers to an external research site.

## Acceptance requirements

1. GitHub Actions test suite passed after fixing dependency-lock drift, stale frontend assertions, the missing in-memory email-verification table, incorrect Atlas module paths, malformed market-news query syntax and duplicated trailing marketplace-controller fragments. Re-run after any subsequent code change.
2. Review formulas and rounding with a licensed clearing agent and relevant destination-country rules before operational use.
3. Add source adapters for official customs/tariff sources and licensed FX/freight providers. Never label cached, user-supplied or demo values as live.
4. Define cache expiry by source and data type; show retrieved-at and valid-until timestamps in UI.
5. Add API routes with role-appropriate read access and validate provider responses before storing or returning them.
6. Extend the same contract and provenance/freshness display to market-intelligence, Trade OS and Trade Room without replacing the protected `frontend-v3.html`.
7. Add API/database tests, source outage tests, stale-data UI tests and cross-surface consistency tests.
8. Keep provider integration and backend deployment separate from this source-level work; Railway is deferred.

## Not yet implemented or verified

- No verified live FX, freight, tariff or regulatory provider adapter is claimed by this phase starter.
- No production tariff classification, binding customs calculation, customs submission, freight booking or financial transaction is performed by this module.
- The intelligence-centre landed-cost form and provider-readiness status are connected to authenticated endpoints in source, but neither integration has been runtime-tested against a deployed backend.
- CI has passed on the current tested source revision; the suite uses the in-memory development database and mocked SMTP in tests, not a deployed production database or real mail provider.
- Browser-level verification across all dashboard pages and both themes has not been completed in this turn. Deployment status remains unverified; Railway is intentionally deferred.

## Remaining operational acceptance gates

1. Run browser/API checks for the intelligence-centre estimate endpoint and verify both server success and fallback behaviour against the intended deployed backend.
2. Add source-attributed country/tariff and FX/freight adapters only where an authoritative source/provider is available and credentials/terms permit it. Until then, those providers stay explicitly unconnected.
3. Extend the evidence/freshness panel to any additional Trade OS and Trade Room surfaces not already covered by the buyer dashboard.
4. Verify both themes and role-based access in a browser, then confirm the intended Vercel build. Railway remains deferred.
