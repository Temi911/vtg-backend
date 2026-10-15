# VTG Phase 7 — Agent Network & Inspection Operations

Status: **Existing workflow foundation audited; one quote-validation defect fixed; full operational acceptance remains pending.**

## Objective

Support verified inspection agents in China and South Korea, buyer-requested pre-shipment inspections, evidence-based reports, controlled assignment, buyer decisions and auditable payout operations.

## Existing foundation

- Agent profile, status review and agent statistics endpoints.
- Buyer inspection quote/request endpoints, agent assignment workflow, evidence upload and report submission.
- Admin queue, approved-agent selection and payout status controls.
- Inspection requests are blocked from agent assignment until the buyer payment record is marked paid.
- Agent approval requires verified government ID, proof of address, and at least one verified business, professional or reference document.
- Role guards separate buyer, agent and admin routes.

## Phase 7 fix in this continuation

The quote handler checked `d.orderId` to verify that the linked order belonged to the buyer and was eligible for inspection, but the Zod schema did not declare `orderId`. Zod therefore stripped the field before those checks could run. The schema now accepts an optional UUID order ID so the ownership and eligibility checks can execute. A regression test covers this path and the main role boundaries.

## Acceptance tests and launch gates

- Run the complete backend test suite on the latest commit.
- Verify payment initialization, provider verification and payment confirmation with sandbox credentials and webhook/replay controls before live use.
- Verify evidence storage is private, persistent and malware-scanned in the target hosting environment.
- Exercise buyer, agent and admin journeys with real authenticated test identities, including cross-user evidence denial and invalid state transitions.
- Approve inspection pricing, agent service terms, payout/reconciliation ownership and dispute handling.
- Do not present inspection pricing, provider status, payouts or reports as operationally verified until the above checks pass.

Railway deployment is not part of this change. No live payment or real payout was enabled.
