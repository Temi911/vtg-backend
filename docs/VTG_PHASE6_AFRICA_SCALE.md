# VTG Phase 6 — Africa Scale

Status: **Phase 6 software foundation implemented; regional markets remain planning entries until the launch gates below are independently verified.**

## Scope
Create a country-aware catalogue so VTG can expand beyond a single-country experience without pretending that regional operations, representatives, live shipping routes, or regulatory integrations already exist.

## Initial market configuration
- Nigeria — foundation market; NGN, en-NG, Africa/Lagos; configured reference ports include Apapa, Tin Can Island, Lekki, Onne, Calabar and Delta Ports.
- Ghana — planned; GHS, en-GH, Africa/Accra; Tema and Takoradi.
- Kenya — planned; KES, en-KE and sw-KE, Africa/Nairobi; Mombasa.
- South Africa — planned; ZAR, en-ZA, Africa/Johannesburg; Durban, Cape Town and Ngqura.
- Egypt — planned; EGP, en-EG and ar-EG, Africa/Cairo; Alexandria, Port Said and Ain Sokhna.
- Morocco — planned; MAD, fr-MA and ar-MA, Africa/Casablanca; Tanger Med and Casablanca.

These are static planning/reference entries, not live port schedules, current congestion, carrier services, or verified route availability. Confirm current port naming and operating details before external publication or operational reliance.

## API
- `GET /api/africa/markets` returns the market catalogue and explicitly marks it as planning data.
- `GET /api/africa/markets?country=NG` returns one market.
- Unknown or malformed country codes return a 404 response.
- Regional representative directories remain empty until real people, mandates and contact details are approved and verified.
- Country compliance is explicitly marked for authority/professional verification; this endpoint does not provide legal advice or a definitive customs checklist.

## Implemented
- Country-specific currency, locale, time-zone, region and port reference configuration.
- Read-only catalogue API mounted at `/api/africa/markets`.
- Responsive `africa-markets.html` catalogue page with country/region/currency/locale/time-zone/port search, market-status filtering, light/dark theme, clear API-failure handling, and status disclaimers.
- Landing-page Explore footer link to the Africa Markets page.
- Input validation and regression tests for regional coverage, country lookup, planned/live labels, empty representative directories, page/API wiring and key status cues.
- Explicit distinction between planning data and live provider data.

## Launch gates (not represented as completed)
1. Review market prioritization with VTG and approve the country-by-country rollout order.
2. Verify ports, inland corridors, freight partners and actual operating coverage country by country with accountable local partners.
3. Add representatives only after the person, mandate, contact details and consent are confirmed.
4. Integrate country-specific regulator/customs sources and record source URLs, effective dates and review ownership; obtain qualified local review before presenting checklists as authoritative.
5. Specify and validate country-specific payment availability, tax/landed-cost logic, product restrictions, notifications and localized content before enabling transactions.
6. Run staging and browser checks on deployed frontend/API, perform a security review, and approve deployment. Railway was not modified for this phase.

The GitHub Actions backend test suite passed for the initial catalogue commit. Later UI/navigation and regression-test commits have their own workflow runs; check those results before marking the final revision green. Live browser/deployment verification has not been confirmed from this workspace.

## Not claimed
- No regional representative has been appointed by this implementation.
- No live carrier, vessel, customs, FX or port data is provided by this catalogue.
- No new country is marked as operationally launched.
