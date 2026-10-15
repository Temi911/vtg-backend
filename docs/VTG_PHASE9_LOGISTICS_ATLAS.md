# VTG Phase 9 — Logistics & Trade Atlas

## Scope
Connect order-linked shipments, geocoded route milestones, vessel metadata, customs workflow, inspection evidence, finance status, and proof-of-delivery into a role-scoped logistics timeline.

## Hardening completed
- Bounded and trimmed shipment identifiers and vessel metadata to avoid oversized or whitespace-only tracking fields.
- Bounded tracking milestone location and detail text.
- Customs financial amounts must be finite, non-negative, and capped at a defensive maximum.
- Preserved shipment access checks, monotonic milestone completion, one active milestone, customs release before delivery confirmation, and proof-of-delivery requirements.
- Added Phase 9 regression coverage for Atlas authorization, tracking invariants, customs amount validation, and delivery gates.

## Data and integration limits
- Atlas route points are produced only when a port/location resolves against the maintained location catalogue.
- Live vessel position depends on an external AIS provider and remains unavailable when credentials/provider access are absent.
- The route map is not proof of live vessel movement unless the response explicitly marks live tracking as available.
- Customs statuses and payment states are VTG records; they do not independently confirm government customs systems or actual settlement.

## Acceptance gates still requiring environment validation
- Run the full GitHub Actions test suite and migration checks.
- Validate authenticated buyer, supplier, bank, assigned-agent, and admin journeys against a test PostgreSQL database.
- Verify the actual frontend map loads and displays route points in browser light/dark modes.
- Configure and verify an AIS provider before claiming real-time vessel positions.
- Railway deployment and production smoke checks are intentionally deferred.
