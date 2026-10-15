# VTG Phase 4 — Trust & Compliance

**Status:** GitHub Actions passed the complete migration sequence against a clean PostgreSQL 16 service and the Node test suite on commit `86e886fd9b5e101353ca6b5b45f0d19d8a348039` ([run #38728751945](https://github.com/Temi911/vtg-backend/actions/runs/38728751945)). A subsequent review found the upload-root guard was comparing against `src` rather than the full Express static root; that boundary has been corrected, agent evidence ordering now has a deterministic ID tie-breaker, and the container now creates a writable private-upload directory outside the static root. CI for those newest commits is still required before calling them verified. This confirms clean-database migration compatibility in CI, not a migration on the live Railway database. Final acceptance still requires browser verification and operational storage/retention decisions. Do not represent these source changes as live backend behavior while Railway is deferred.

## Goal

Make identity/business verification and risk signals evidence-based before exposing higher-risk workflows. VTG must distinguish documents uploaded, documents reviewed, and an account/business actually verified. A status is not a legal certification or guarantee.

## Implemented in source

- Verification upload is role-gated before the file is written; only supplier, bank and agent accounts can upload through this endpoint.
- Upload accepts only PDF, JPEG, PNG and WEBP MIME types, caps uploads at 10 MB and one file per request, assigns opaque random on-disk filenames, and checks file signatures against the declared MIME type before the controller records evidence.
- The upload-directory guard compares against the full backend workspace served by Express static middleware, and the Docker image prepares the default private directory as writable by the non-root runtime user. This keeps files outside the public static tree but does not make the container filesystem persistent.
- Verification downloads remain limited to the owner or admin, enforce path confinement to the upload directory, set private/no-store and no-sniff headers, and log the document ID/type and actor in the audit trail.
- The owner's document history now returns reviewer ID/name, review time, status, notes, upload time, optional expiry, and file metadata. User-facing history escapes stored filenames and review notes before rendering. Review decisions retain reviewer identity and timestamps; rejection requires a meaningful note.
- Migration 019 adds optional evidence expiry. Reviewers can set a future expiry only when verifying a document. Expired evidence is displayed as expired and cannot satisfy the required-document check for supplier/bank verification.
- Older evidence of the same type is displayed as superseded when a newer version exists; the review queue focuses on the newest upload, and the review update refuses a superseded document. Historical review decisions remain stored on the original row.
- Existing supplier/bank status derivation requires every role-specific required document to be verified and the organisation logo to exist. Uploaded evidence alone does not mark an account verified. Expired latest evidence cannot satisfy the requirement.
- Agent approval is now evidence-gated in the agent admin status endpoint: it requires current verified government ID, proof of address, and at least one current verified business-registration, professional-certificate, or reference document. Rejection/suspension requires a written review note. Document review and agent-profile approval remain distinct steps.
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
- Files are still stored using the configured local upload directory. Production must use private, persistent storage with controlled access, backup and retention/deletion procedures before relying on document uploads operationally. If an `UPLOAD_DIR` was configured inside the old static tree, move existing files into approved private storage and update the environment configuration before deployment; the code change does not migrate existing files automatically.
- Agent applications have a separate approval workflow. This phase does not silently treat a submitted agent document or risk flag as proof of agent approval.
- The admin risk-flag UI is connected in source, but its actual browser behavior and theme contrast have not yet been visually verified.

## Required acceptance checks still outstanding

1. Completed: GitHub Actions successfully applied all numbered migrations to a clean PostgreSQL 16 database and ran the test suite.
2. Apply migration 018 to a disposable test database and test constraints, foreign keys, filtering, create/update, and competing resolution requests.
3. Exercise cross-account document access with owner, other supplier/bank/agent, buyer and admin identities; confirm only owner/admin can download and only admin can review.
4. Verify file-signature tests, malformed upload handling, oversized uploads, storage cleanup on failed requests, and malware-scanning/storage policy.
5. Confirm all protected routes work with the current agreement middleware and real authenticated roles.
6. Verify the Admin OS trust-risk workflow in a real browser, including light/dark theme contrast, keyboard operation, error states and admin-only API denial for other roles.
7. Define document retention/deletion and private persistent storage operations with the owner; expiry/supersession is represented in source, but scheduled reminders and operational cleanup are not yet implemented. Agent approval evidence requirements are implemented in source, but still need API/database tests.
8. Re-test Phase 3 Trade Intelligence and Phase 2 access requirements as previously recorded. Neither phase is certified complete by Phase 4 source changes.
9. Deploy backend changes only after explicit owner authorization to resume Railway work. Until then, no claim that the migration/API is live.

## Acceptance rule

Phase 4 is not certified complete until the full test suite and database/API integration checks pass, the admin UI workflow is connected and browser-tested, and storage/retention controls are operationally defined. A successful source parse or commit is not a substitute for these checks.
