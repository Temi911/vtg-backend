# VTG account boundaries

## Product boundary

VTG has two distinct account environments:

1. **Public trade accounts:** Buyer, Supplier and Bank / Financial Institution.
2. **Private staff environment:** Administrator, Management, Staff & Operations, Trade Agent, Logistics & Clearing, Verification & Compliance, Customer Support, Finance & Commissions, Inspection & Quality, and Marketing & Catalogue.

Staff roles are internal VTG roles. They are not public account types and must never be offered as options in public signup or public sign-in.

## Public account rules

- Public signup and sign-in are limited to Buyer, Supplier and Bank.
- Supplier and Bank applications may request those business roles, subject to VTG review and verification.
- Public role-request policies accept only Supplier and Bank requests. Agent requests are rejected by both the database policy and review function.
- There is no public Agent signup endpoint or Agent application form.
- A public trade account cannot be converted into a staff account.

## Staff account rules

- Staff accounts are provisioned by an authorised VTG administrator through the private Workforce Management section.
- Staff invitations create a distinct Supabase identity and a pending invitation record. The auth trigger marks the identity as `account_environment='staff'` only when its invitation ID, email and workspace role match a real, unexpired pending invitation.
- Staff accounts do not receive a buyer profile during account creation.
- The profile's `agent` enum value is an internal compatibility marker for workforce identities; it does not grant Agent permissions. Actual workspace permission is stored in `vtg_workforce_members.workspace_role`.
- Staff use separate Workforce Access, Workforce Sign-in or Administrator Sign-in entry points.
- Public trade sign-in rejects staff identities; staff sign-in rejects buyer, supplier and bank identities.
- Staff pages do not load the public VTG navigation/footer shell and are marked `noindex,nofollow`.
- The staff portal is not linked from buyer, supplier or bank journeys.
- A workspace query parameter selects a destination only. It never grants a role or permission.
- The Edge Function verifies the Supabase session and checks the current profile and membership before returning staff data or changing access.
- Admin routes require an active administrator profile in the staff environment.

## Role classification

| Environment | Roles |
|---|---|
| Public | `buyer`, `supplier`, `bank` |
| Staff | `admin`, `manager`, `staff`, `agent`, `logistics`, `compliance`, `support`, `finance`, `inspector`, `marketing` |

## Invitation lifecycle

1. An active VTG administrator signs in through the separate Administrator Sign-in page.
2. The administrator enters a staff email, name and assigned workspace.
3. The Edge Function verifies the administrator's Supabase session and profile.
4. Supabase Auth sends an invitation email whose redirect points to `workforce-accept.html`.
5. The invitee confirms the invitation. The acceptance endpoint checks the authenticated email, staff environment, invitation ID and one-time token hash.
6. The database transaction creates the active workforce membership and marks the invitation accepted.
7. The invitee signs in through Workforce Sign-in. The requested workspace must match an active membership.

Administrators can list invitations and staff assignments, resend or revoke pending invitations, suspend or reactivate workspace assignments, and remove assignments. If a staff member has no remaining active assignments, their profile is made inactive.

## Security controls

- The service-role key remains inside the Supabase Edge Function; it is never shipped to the browser.
- The invitation Edge Function manually verifies the bearer token with Supabase Auth because platform JWT verification is disabled for this function.
- The invitation acceptance RPC is executable only by `service_role`, not by `anon` or `authenticated`.
- The invitation token is stored as a SHA-256 hash and checked during acceptance.
- The profile trigger verifies the invitation row before classifying an identity as staff; editable user metadata alone is not enough.
- Users cannot change their own `account_environment`, role or active state through profile updates.
- RLS on workforce memberships permits staff to read their own assignments and administrators to manage the workforce register.
- Suspended or removed assignments no longer satisfy the staff membership check.

## Release checks still required

1. Add the exact deployed `workforce-accept.html` URL to Supabase Auth's allowed redirect URLs.
2. Confirm the Supabase **Invite user** email template and SMTP delivery settings.
3. Run a controlled invitation test using a designated test email; verify accept, sign-in, wrong-workspace denial, revoke, suspend and reactivate.
4. Verify that all legacy Node API routes used by internal dashboards also enforce the Supabase staff membership. Some older Agent data endpoints still use the legacy API and require a separate migration before they can be considered production-ready.
5. Run GitHub Actions and the Supabase security advisors after the final database and function changes.
6. Merge the stacked PRs in order and deploy the matching website commit before enabling staff invitations for real staff.

No test staff invitation has been sent and no staff account has been created as part of this implementation.
