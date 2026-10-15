# VTG Phase 8 — Payments & Finance Foundation

Status: **Finance code hardening committed; live payment-provider and wallet production acceptance remain gated.**

## Objective

Make the VTG finance foundation safer and auditable without presenting simulated payment rails, indicative FX rates, or internal wallet entries as real-world settlement.

## Phase 8 work completed in this continuation

- Replaced the wallet-send controller's separate debit-then-credit calls with one `wallet.transfer` transaction.
- The transfer locks sender and recipient wallet rows in deterministic ID order, checks available funds, updates both balances, and writes paired debit/credit transaction records in the same database transaction. If a step fails, the transaction rolls back rather than leaving only one side applied.
- Rejects non-finite, non-positive and excessively large transfer amounts; trims and bounds transfer notes; prevents self-transfers.
- Added regression checks for atomic transfer wiring, balance locking, insufficient-funds handling, paired ledger entries and honest payment-provider readiness labels.
- Preserved fail-closed provider behavior: setting `PAYMENTS_MODE=live` alone does not enable settlement because no licensed live adapter is registered.

## Existing finance foundation

The codebase includes payment requests, role-scoped finance summaries, reconciliation history, settlement/refund ledger entries, bank/admin status controls, wallet balances and transactions, and informational FX conversion. These are code capabilities, not proof of live financial integrations.

## Acceptance and launch gates

1. Run the latest backend workflow and inspect any failures before calling the commit green.
2. Add integration tests against a disposable PostgreSQL database to prove transaction rollback and concurrent transfer behavior.
3. Verify wallet account uniqueness constraints and database column precision against the production schema.
4. Require an approved, licensed provider, sandbox credentials, signed webhooks, replay/idempotency protection, refund handling and reconciliation before enabling external settlement.
5. Define how wallet balances are funded and redeemed. Internal ledger transfers must not be described as bank deposits, escrow, crypto transfers or FX execution.
6. Keep letters of credit, guarantees and other regulated trade-finance instruments under the issuing bank's authority. VTG does not issue them.
7. Do not deploy to Railway as part of this phase; hosting work remains deferred.

## Not claimed

- No real money movement, escrow, crypto transfer, wire transfer, SWIFT instruction or live FX execution was enabled.
- No production database concurrency test or live-provider sandbox test has been completed by this code change.
- No Railway deployment was performed.
