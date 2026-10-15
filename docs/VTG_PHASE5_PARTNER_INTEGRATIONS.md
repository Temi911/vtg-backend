# VTG Phase 5 — Partner Integrations

Status: **In progress — integration contracts and readiness safeguards are under test. No live external partner is connected yet.**

## Objective

Connect VTG to approved payment, FX, shipment-tracking, trade-news, and operational partners without presenting a mock, indicative, or unavailable result as live data or a completed financial transaction.

## Current implementation found in the repository

- Payment rails are behind `src/services/paymentProviders.js`. They return mock results by default. When `PAYMENTS_MODE=live`, payment initiation fails closed because no licensed live adapters are registered. A configuration flag alone does not enable live settlement.
- FX rates, news and vessel-tracking integration status are exposed through authenticated integration routes. FX and news use endpoint configuration and report unavailable when the required base URL is absent.
- Integration status currently reports configuration flags, not an end-to-end successful provider health check. Do not treat `configured: true` as proof that a partner is reachable or that data is current.
- The payment API still needs provider-specific webhook signature verification, replay protection, idempotent event handling, reconciliation, and sandbox contract tests before a live rail can be enabled.

## Phase 5 work order

1. **Provider contracts and readiness:** define health, freshness, timeout, error, idempotency and provenance expectations; keep mock/sandbox/live statuses distinct.
2. **FX and trade intelligence:** choose an approved market-data provider, obtain credentials and terms, implement its response adapter, and test currencies, malformed responses, timeouts and stale data.
3. **Shipment and vessel tracking:** select a licensed tracking provider; map provider events to VTG shipment milestones; test unknown vessels, delayed feeds and duplicate/out-of-order events.
4. **Payments and trade finance:** begin with a partner-approved sandbox. Implement signed webhooks, replay/idempotency protection, ledger reconciliation, failure/refund handling and audit records. LC/SBLC/BG/DLC issuance remains a bank-controlled workflow; VTG must not claim to issue these instruments itself.
5. **Notifications:** select and configure email/SMS providers, delivery tracking and retry policy without exposing private trade documents in messages.
6. **Go-live gates:** provider contract/approval, secrets in hosting environment, sandbox evidence, security review, operational owner, alerting and a documented rollback plan.

## Tests added

`test/phase5-partner-integrations.test.js` checks that missing FX/news endpoints remain unavailable, default payment rails are labelled mock, and live payment mode rejects initiation until a real adapter is registered.

## Required external inputs

No partner credentials or approved provider choices were found in the repository configuration available for this work. To finish real integrations, VTG needs provider accounts/contracts and sandbox credentials. Never commit secrets to GitHub. Configure them in the hosting platform only after the provider and environment are approved.

## Not done / no false live claims

- No real money movement, SWIFT message, FX execution, escrow release, crypto transfer, or D/P document release has been enabled.
- No live vessel, FX or news provider has been proven reachable in production.
- No webhook has been enabled for a real partner.
- No Railway deployment was performed.
