# VTG Production Hardening — v2

Completed in this build:
- LC detail access is restricted to the buyer, supplier, assigned bank, or admin.
- Bank LC lists are limited to LCs assigned to the bank or orders assigned to that bank.
- LC issuance requires bank authorization and `requested` state.
- Shipping-document presentation requires the LC supplier and `issued` state.
- LC payment requires the issuing bank and `docs_presented` state.
- LC payment + supplier wallet credit now commit in one database transaction.
- Document listing, upload, download, and review now enforce order/LC access controls.
- Document upload requires an associated order or LC and rejects mismatched order/LC pairs.
- Production demo fallback remains disabled from the previous hardening build.

Still required before production:
- Rotate/revoke any previously exposed SMTP credential (already done by operator).
- Configure production secrets only in the hosting provider.
- Move uploaded files to durable object storage.
- Add formal DB migrations.
- Run staging and end-to-end authorization tests.


## Production secrets and database hardening

- Production startup now requires `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, each at least 32 characters.
- Production startup requires `DATABASE_URL`.
- Production never falls back to the in-memory `pg-mem` database when PostgreSQL is unavailable.
- Production requires an explicit `CORS_ORIGIN` allowlist. Wildcard `*` is only accepted outside production.
- Keep production secrets in the hosting provider's environment-variable/secret store.
