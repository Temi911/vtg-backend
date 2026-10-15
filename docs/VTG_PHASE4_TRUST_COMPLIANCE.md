# VTG Phase 4 — Trust & Compliance

**Status:** The latest full GitHub Actions workflow passed on commit `1b82b9ccb7797f1ba4e34316162c09c1a64cc598` ([run #38761212703](https://github.com/Temi911/vtg-backend/actions/runs/38761212703)). It applied all migrations to a clean PostgreSQL 16 service and passed the Node test suite, including private upload-boundary runtime checks, role-guard outcomes, controller-level document access and orphan-cleanup tests, trust-risk database constraint/foreign-key/filter/competing-resolution tests, source-level theme contrast checks, ClamAV protocol clean/infected responses, fail-closed scanner behavior, and the production persistent-mount requirement. This confirms clean-database migration compatibility and the tested source behavior in CI, not a migration on the live Railway database or visual browser verification. ClamAV upload scanning and a persistent named volume are now wired into local Docker Compose and have regression tests; final acceptance still requires a real persistent volume and scanner service on the hosting platform, live browser checks, and an approved retention/deletion policy. Do not represent these source changes as live backend behavior while Railway is deferred.

## Goal

Make identity/business verification and risk signals evidence-based before exposing higher-risk workflows. VTG must distinguish documents uploaded, documents reviewed, and an account/business actually verified. A status is not a legal certification or guarantee.

## Implemented in source

- Verification upload is role-gated before the file is written; only supplier, bank and agent accounts can upload through this endpoint.
- Upload accepts only PDF, JPEG, PNG and WEBP MIME types, caps uploads at 10 MB and one file per request, assigns opaque random on-disk filenames, checks file signatures against the declared MIME type, and runs a ClamAV INSTREAM scan before evidence is persisted. Production fails closed and deletes the temporary file if the scanner is not configured, unreachable, times out, or reports malware. Non-production environments may omit the scanner unless MALWARE_SCAN_REQUIRED=true; that is a developer convenience, not evidence of malware scanning.
- The upload-directory guard compares against the full backend workspace served by Express static middleware. compose.yaml mounts the named vtg_private_uploads volume at /usr/src/private-uploads and configures the backend to use the internal clamav service. The Docker image prepares the private directory for the non-root runtime user. The Compose volume is persistent across container replacement, but host-provider persistence is not configured until its volume is mounted at the same path.
- Verification downloads remain limited to the owner or admin, enforce path confinement to the upload directory, set private/no-store and no-sniff headers, and log the document ID/type and actor in the audit trail.
- The owner's document history now returns reviewer ID/name, review time, status, notes, upload time, optional expiry, and file metadata. User-facing history escapes stored filenames and review notes before rendering. Review decisions retain reviewer identity and timestamps; rejection requires a meaningful note.
- Migration 019 adds optional evidence expiry. Reviewers can set a future expiry only when verifying a document. Expired evidence is displayed as expired and cannot satisfy the required-document check for supplier/bank verification.
- Older evidence of the same type is displayed as superseded when a newer version exists; the review queue focuses on the newest upload, and the review update refuses a superseded document. Historical review decisions remain stored on the original row.
- Existing supplier/bank status derivation requires every role-specific required document to be verified and the organisation logo to exist. Uploaded evidence alone does not mark an account verified. Expired latest evidence cannot satisfy the requirement.
- Agent approval is now evidence-gated in the agent admin status endpoint: it requires current verified government ID, proof of address, and at least one current verified business-registration, professional-certificate, or reference document. Rejection/suspension requires a written review note. Document review and agent-profile approval remain distinct steps.
- Added an explicit structured trust-risk flag table in migration 018_trust_risk_flags.sql. Each flag records target account, creator, category, severity, source type/reference, rationale, status, and resolution notes/actor/time. Database constraints require resolution provenance for terminal states.
- Added admin-only trust-risk endpoints under /api/admin/trust-risk-flags to list/filter, create, and update flags. Creating and changing a flag writes audit events. Resolution/dismissal requires explanatory notes; conditional updates prevent a second terminal decision from overwriting the first.
- Added `vtg-backend/test/phase4-trust-compliance.test.js` checks for upload signature validation, access controls, review provenance, download auditing, migration constraints, admin-only risk routes, and explicit light/dark status contrast selectors.
- Added `vtg-backend/test/phase4-upload-path.test.js` runtime tests proving unsafe upload directories inside the public static root are rejected and private directories outside it are accepted.
- Added `vtg-backend/test/phase4-role-guard.test.js` direct middleware tests for unauthenticated, forbidden, allowed, and malformed roles.
- Added `vtg-backend/test/phase4-verification-api.test.js` controller tests for cross-account download denial, owner download, admin authorization reaching the path guard, no-store/no-sniff headers, path traversal rejection, stale/superseded review rejection, and cleanup of unrecorded uploads when document-type validation or database insertion fails.
- Added `vtg-backend/test/phase4-trust-risk-db.test.js`, which runs against the CI PostgreSQL service to exercise trust-risk foreign keys, severity constraints, required resolution provenance, filters, and competing terminal decisions.
- Improved dark-mode contrast for pending, verified, and rejected status chips on `verification.html`; theme CSS regression checks are automated, but screenshots and actual browser interaction remain unverified.
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

1. Completed in CI: GitHub Actions successfully applied all numbered migrations to a clean PostgreSQL 16 database and passed the Node test suite on commit `ee6e6d7`.
2. Completed in CI for migration 018: a disposable PostgreSQL service exercised foreign keys, severity/resolution constraints, filtering, and competing terminal decisions. Controller behavior is still not covered end-to-end over HTTP.
3. Partially completed in controller tests: owner download, different-account denial, admin reaching the path guard, and stale-review rejection are covered. Still required: full HTTP/API tests using real authenticated supplier, bank, agent, buyer, and admin identities; confirm only admin can review.
4. Partially completed in CI: file-signature validation and cleanup when document-type validation or database insertion fails are tested. Still required: malformed/oversized HTTP upload tests, malware scanning, private persistent storage, and operational retention/deletion policy.
5. Confirm all protected routes work with the current agreement middleware and real authenticated roles.
6. Outstanding: verify the Admin OS trust-risk workflow in a real browser, including light/dark theme contrast, keyboard operation, error states and admin-only API denial for other roles. Automated CSS-token checks do not substitute for browser verification.
7. Define document retention/deletion and private persistent storage operations with the owner; expiry/supersession is represented in source, but scheduled reminders and operational cleanup are not yet implemented. Agent approval evidence requirements are implemented in source, but still need API/database tests.
8. Re-test Phase 3 Trade Intelligence and Phase 2 access requirements as previously recorded. Neither phase is certified complete by Phase 4 source changes.
9. Deploy backend changes only after explicit owner authorization to resume Railway work. Until then, no claim that the migration/API is live.

## Acceptance rule

Phase 4 is not certified complete until the full test suite and database/API integration checks pass, the admin UI workflow is connected and browser-tested, and storage/retention controls are operationally defined. A successful source parse or commit is not a substitute for these checks.


## Malware scanning and storage configuration

- Local Docker Compose: run `docker compose up --build` to start PostgreSQL, ClamAV and VTG; verification uploads are scanned by ClamAV before the controller inserts a document record. The ClamAV port is private to the Compose network, not published to the host.
- Host platform configuration required before enabling production uploads: mount a persistent volume at `/usr/src/private-uploads` and set `UPLOAD_DIR=/usr/src/private-uploads`; configure `CLAMAV_HOST` to the private hostname of a reachable ClamAV daemon and `CLAMAV_PORT=3310`. Keep `MALWARE_SCAN_REQUIRED=true`. Do not expose ClamAV publicly or accept uploads when scanning is unavailable.
- The code change does not create a Railway volume or scanner service, add host secrets, migrate existing documents, or deploy anything. Those are platform-side actions and remain pending while Railway changes are deferred. Existing documents must be migrated to the new persistent volume before switching the live upload path.
- `phase4-malware-scan.test.js` uses a local fake ClamAV protocol server to verify clean/infected responses and verifies production fail-closed behavior when the scanner is missing. This is a protocol regression test, not a live malware-engine efficacy test.
- Retention is intentionally not automated yet. No records or files should be purged until the company approves a retention period, deletion authority, legal-hold behavior, and audit-log treatment. Once approved, implement a dry-run-first purge workflow and test its transaction and file-cleanup behavior.
- Browser verification in both themes is still outstanding; source/CSS tests are not a substitute for rendering the actual pages in a browser.
