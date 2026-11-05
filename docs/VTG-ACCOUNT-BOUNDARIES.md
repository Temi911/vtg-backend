# VTG account boundaries

## Product boundary

VTG has two distinct account environments:

1. **Public trade accounts:** Buyer, Supplier and Bank / Financial Institution.
2. **Private staff environment:** Administrator, Management, Staff & Operations, Trade Agent, Logistics & Clearing, Verification & Compliance, Customer Support, Finance & Commissions, Inspection & Quality, and Marketing & Catalogue.

Staff roles are internal VTG roles. They are not public account types and must never be offered as options in public signup or public sign-in.

## Public account rules

- Public signup is limited to Buyer, Supplier and Bank.
- Public sign-in offers only Buyer, Supplier and Bank.
- Supplier and Bank applications may request those business roles, subject to VTG review and verification.
- There is no public Agent signup endpoint. Existing Agent accounts remain staff accounts and use the workforce portal.
- A public user must not be able to choose or self-assign an internal role.

## Staff account rules

- Staff accounts are provisioned by an authorised VTG administrator; workforce access is invitation-only.
- Staff use the separate Workforce Access, Workforce Sign-in or Administrator Sign-in entry points.
- Staff pages do not load the public VTG navigation/footer shell and are marked noindex where appropriate.
- The staff portal must not be linked from buyer, supplier or bank journeys.
- A workspace query parameter selects a destination only. It never grants a role or permission.
- The server must verify the authenticated account's stored role and active status on every protected API request. UI checks are not a security boundary.
- Admin routes remain restricted to the admin role. Operational roles receive only their assigned permissions.

## Role classification

| Environment | Roles |
|---|---|
| Public | `buyer`, `supplier`, `bank` |
| Staff | `admin`, `manager`, `staff`, `agent`, `logistics`, `compliance`, `support`, `finance`, `inspector`, `marketing` |

## Release checks

Before enabling the boundary in production:

1. Confirm the API does not expose public staff registration (including legacy agent registration).
2. Confirm all staff creation/invitation paths require administrator authorization.
3. Confirm public signup/login cannot authenticate an internal role into a trade dashboard.
4. Confirm staff sign-in cannot authenticate buyer, supplier or bank accounts into an internal dashboard.
5. Confirm backend route middleware and database policies enforce least privilege; hiding links or checking roles in browser code is insufficient.
6. Test all three public account types and representative staff roles, including inactive accounts and incorrect workspace URLs.
7. Verify that public navigation and email copy do not enumerate staff-only dashboards.

## Implementation note

This change removes the legacy public Agent registration endpoint and separates the workforce/admin pages from the public shell. It does not, by itself, complete staff invitation provisioning or prove database/API isolation. Those remain release gates and must be verified before describing the staff environment as fully secured.
