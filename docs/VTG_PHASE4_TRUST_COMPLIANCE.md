# VTG Phase 4 — Trust & Compliance

**Status:** Started; not accepted. Source-level hardening and regression checks are committed, but runtime, cross-account, and browser acceptance remains outstanding.

## Goal

Make identity/business verification and risk signals evidence-based before exposing higher-risk workflows. VTG must distinguish documents uploaded, documents reviewed, and an account/business actually verified. A status is not a legal certification or guarantee.

## Work started

- Hardened verification-document downloads: authorization remains limited to the document owner or admin; resolved file paths must remain inside the private upload directory; download responses use private/no-store caching and disable MIME sniffing.
- Added `vtg-backend/test/phase4-trust-compliance.test.js` source-regression checks for document ownership/admin access, path confinement, sensitive-download headers, admin-only review, rejection-note requirements, pending review-queue scope and audit event presence.
- Existing verification controller already defines separate supplier and bank document-type allowlists and required document lists; the business verification status is recalculated from the latest required-document states plus the presence of the organisation logo.
- Existing admin review workflow records reviewer identity, review time and review notes, and logs a review audit event. Rejection requires a non-empty explanation.

## Required trust rules

1. **Evidence states:** uploaded, pending review, verified, rejected/needs correction, expired, and superseded must not be conflated. A file being uploaded is not proof that it is authentic.
2. **Provenance:** record who reviewed each item, when, the decision, reason, and the evidence version reviewed.
3. **Least privilege:** only the owner and specifically authorized reviewers may access sensitive verification files; no public document URLs.
4. **Risk flags:** flags need source, severity, timestamp, reviewer/owner, rationale, status, and a resolution trail. Flags should not silently block or certify a user without an explicit policy.
5. **Audit trail:** record important access and decision events without copying document contents, credentials, or unnecessary personal data into logs.
6. **Data minimization and retention:** define retention/deletion periods and secure storage, backup, and access procedures before production handling of identity documents.
7. **Account status:** supplier/bank business verification should not be presented as a verified account until every required item and required profile evidence is accepted. Agent review currently does not have a comparable derived account-level verification status and needs a deliberate policy.
8. **Role and tenant isolation:** test every document endpoint across owner, another account of the same role, buyer, supplier, bank, agent, and admin; cross-account access must fail.
9. **Operational caveat:** do not claim legal KYC/KYB, AML screening, sanctions screening, or regulator validation unless an authorized process/provider actually performs it.

## Remaining work before acceptance

- Execute the current backend test suite in CI and verify the newly added checks pass; static source checks are not a runtime security test.
- Add database/API integration tests for cross-account download attempts, review races, rejected and superseded evidence, and recalculated business status.
- Inspect the upload middleware and deployment storage lifecycle: MIME metadata alone is not content validation; establish content sniffing, malware scanning, private persistent storage, and retention/deletion controls before accepting sensitive documents in production.
- Add an explicit verification history/status response with timestamps and reviewer provenance, and define expired/superseded handling.
- Define agent verification policy and derived status rather than treating document review as full agent verification.
- Add structured risk flags with provenance and resolution history; do not infer a risk decision from missing data alone.
- Run browser tests for the verification upload, review queue and status display in both light and dark themes, plus role-based access checks.
- Reconcile any schema migration required by the new status/history model before implementing it; do not guess table columns.
- Railway remains deferred. Source changes in this phase are not live backend behavior until the owner explicitly authorizes backend deployment.

## Acceptance gate

Phase 4 is not complete until CI passes, database/API tests prove cross-account isolation and review integrity, verification states are consistent, and the browser UI shows the right state in both themes. Source presence or a successful frontend deployment is not sufficient evidence.
