# VTG Phase 4 — Trust & Compliance

**Status:** Implementation expanded; acceptance remains pending runtime/CI, database and browser verification. Do not represent these source changes as live backend behavior while Railway is deferred.

## Goal

Make identity/business verification and risk signals evidence-based before exposing higher-risk workflows. VTG must distinguish documents uploaded, documents reviewed, and an account/business actually verified. A status is not a legal certification or guarantee.

## Implemented in source

- Verification upload is role-gated before the file is written; only supplier, bank and agent accounts can upload through this endpoint.
- Upload accepts only PDF, JPEG, PNG and WEBP MIME types, caps uploads at 10 MB and one file per request, assigns opaque random on-disk filenames, and checks file signatures against the declared MIME type before the controller records evidence.
- Verification downloads remain limited to the owner or admin, enforce path confinement to the upload directory, set private/no-store and no-sniff headers, and log the document ID/type and actor in the audit trail.
- The owner's document history now returns reviewer ID/name, review time, status, notes, upload time and file metadata. Review decisions retain reviewer identity and timestamps; rejection requires a meaningful note.
- Existing supplier/bank status derivation requires every role-specific required document to be verified and the organisation logo to exist. Uploaded evidence alone does not mark an account verified.
- Added an explicit structured trust-risk flag table in migration 018_trust_risk_flags.sql. Each flag records target account, creator, category, severity, source type/reference, rationale, status, and resolution notes/actor/time. Database constraints require resolution provenance for terminal states.
- Added admin-only trust-risk endpoints under /api/admin/trust-risk-flags to list/filter, create, and update flags. Creating and changing a flag writes audit events. Resolution/dismissal requires explanatory notes; conditional updates prevent a second terminal decision from overwriting the first.
- Added vtg-backend/test/phase4-trust-compliance.test.js checks for upload signature validation, access controls, review provenance, download auditing, migration constraints and admin-only risk routes.
- Added indexes for trust-flag lookup by account and by status/severity.

## Endpoints introduced

- GET /api/admin/trust-risk-flags — admin-only; optional status/severity filters and a bounded result limit.
- POST /api/admin/trust-risk-flags — admin-only; validates target user, severity, category, source, and evidence-based rationale.
- PATCH /api/admin/trust-risk-flags/:id — admin-only; moves an open/reviewing flag to reviewing, resolved, or dismissed, with required notes for terminal decisions.

These endpoints are source-defined and not available in a deployed backend until the migration and backend code are deployed.

## Important boundaries

- A risk flag is an internal review record, not an automated finding of wrongdoing and not a legal/sanctions determination.
- No KYC/KYB, AML or sanctions screening provider is connected or claimed.
- MIME and file-signature checks are useful initial controls, not malware scanning or full document sanitization.
- Files are still stored using the configured local upload directory. Production must use private, persistent storage with controlled access, backup and retention/deletion procedures before relying on document uploads operationally.
- Agent applications have a separate approval workflow. This phase does not silently treat a submitted agent document or risk flag as proof of agent approval.
- The admin risk-flag API has no new user-facing dashboard panel yet; it is an API foundation and must be connected to the admin verification/compliance UI before a browser workflow can be accepted.

## Required acceptance checks still outstanding

1. Run the full backend suite in a real Node environment/CI and fix all failures. Syntax checks alone are not test execution.
2. Apply migration 018 to a disposable test database and test constraints, foreign keys, filtering, create/update, and competing resolution requests.
3. Exercise cross-account document access with owner, other supplier/bank/agent, buyer and admin identities; confirm only owner/admin can download and only admin can review.
4. Verify file-signature tests, malformed upload handling, oversized uploads, storage cleanup on failed requests, and malware-scanning/storage policy.
5. Confirm all protected routes work with the current agreement middleware and real authenticated roles.
6. Connect the risk-flag API to the admin UI, render source/severity/status/resolution provenance, and verify light/dark theme contrast and keyboard operation.
7. Define and implement document retention, expiry/supersession, and the agent-specific evidence review policy.
8. Re-test Phase 3 Trade Intelligence and Phase 2 access requirements as previously recorded. Neither phase is certified complete by Phase 4 source changes.
9. Deploy backend changes only after explicit owner authorization to resume Railway work. Until then, no claim that the migration/API is live.

## Acceptance rule

Phase 4 is not certified complete until the full test suite and database/API integration checks pass, the admin UI workflow is connected and browser-tested, and storage/retention controls are operationally defined. A successful source parse or commit is not a substitute for these checks.
