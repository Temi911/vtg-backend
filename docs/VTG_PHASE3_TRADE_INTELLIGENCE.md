# VTG Phase 3 — Trade Intelligence

**Status:** In progress. The shared data contract and first unit tests have been committed; no test run or live integration is claimed until CI results are observed.

## Goal

Use one versioned contract for intelligence shown in Trade OS, Marketplace and Trade Room. Every figure or rule must expose its status, source provenance, timestamps, assumptions and limitations. Static previews and user-entered assumptions must never be presented as live market data or official rulings.

## Initial implementation

- `vtg-backend/src/services/trade-intelligence.contract.js` defines the version `1.0` record schema and accepted record kinds: FX rates, tariff rules, country rules, freight quotes, market signals and landed-cost outputs.
- Statuses are explicit: `live`, `indicative`, `demo` or `unavailable`.
- Source provenance includes authority type, URL where available, published time, retrieval time and expiry time.
- Expired evidence is marked stale. A record is marked `isDecisionReady` only when it is live, has current expiry metadata and is attributed to an official source. This is a display/readiness signal, not a legal or commercial guarantee.
- `calculateIndicativeLandedCost` uses user-supplied goods value, freight, insurance, duty rate, VAT rate/basis and other charges. It returns component-level arithmetic, assumptions and limitations; it does not discover or certify applicable tariff rates.
- `vtg-backend/test/trade-intelligence.contract.test.js` covers required retrieval timestamps, stale-source handling, normalization and landed-cost arithmetic.

## Acceptance requirements

1. Run the test suite in GitHub Actions and resolve any failures; until then, tests are pending.
2. Review formulas and rounding with a licensed clearing agent and relevant destination-country rules before operational use.
3. Add source adapters for official customs/tariff sources and licensed FX/freight providers. Never label cached, user-supplied or demo values as live.
4. Define cache expiry by source and data type; show retrieved-at and valid-until timestamps in UI.
5. Add API routes with role-appropriate read access and validate provider responses before storing or returning them.
6. Connect the same contract to intelligence-centre, market-intelligence, Trade OS and Trade Room without replacing the protected `frontend-v3.html`.
7. Add API/database tests, source outage tests, stale-data UI tests and cross-surface consistency tests.
8. Keep provider integration and backend deployment separate from this source-level work; Railway is deferred.

## Not yet implemented or verified

- No verified live FX, freight, tariff or regulatory provider adapter is claimed by this phase starter.
- No production tariff classification, binding customs calculation, customs submission, freight booking or financial transaction is performed by this module.
- No live frontend integration is claimed yet.
- CI and local runtime results remain unverified in the current execution environment.

## Next work sequence

1. Confirm the contract tests pass in CI.
2. Inspect existing API routes and current intelligence UI data sources, then add a read-only API surface that reuses the contract.
3. Add source-attributed country/tariff and FX/freight adapters only where an authoritative source/provider is available.
4. Integrate the contract into the intelligence UI and display evidence status consistently.
