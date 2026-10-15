# VTG Phase 6 — Africa Scale

Status: **Initial regional configuration foundation implemented; not yet operationally launched across the listed countries.**

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
- Read-only catalogue API.
- Input validation and regression tests for regional coverage, country lookup, planned/live labels, and empty representative directories.
- Explicit distinction between planning data and live provider data.

## Still required before launch
1. Review market prioritization with VTG.
2. Verify ports, inland corridors, freight partners and operating coverage country by country.
3. Approve and verify regional representatives before adding them.
4. Integrate country-specific regulator/customs sources and record source URLs, effective dates and review ownership.
5. Add localized UI/content and country-aware forms, payments, tax/landed-cost logic and notifications only after their requirements are verified.
6. Complete staging/browser checks, security review and deployment approval. Railway remains untouched in this phase.

## Not claimed
- No regional representative has been appointed by this implementation.
- No live carrier, vessel, customs, FX or port data is provided by this catalogue.
- No new country is marked as operationally launched.
