# VTG Workforce Operations Foundation

The nine internal workspaces share one authenticated task and handoff service: Staff & Operations, Management, Trade Agents, Logistics & Clearing, Verification & Compliance, Customer Support, Finance & Commissions, Inspection & Quality, and Marketing & Catalogue.

- `vtg_workforce_tasks` stores role-scoped assignments, priority, due date, status and optional references to existing VTG records. It does not duplicate customer, payment or compliance records.
- `vtg_workforce_handoffs` records role-to-role transfers and requires a decision by an authorised member of the receiving workspace.
- `vtg_workforce_activity` stores append-only task and handoff history.

The browser has no direct table privileges. The `workforce-operations` Edge Function validates the Supabase bearer token, active staff profile and current `vtg_workforce_members` assignments. Managers and administrators can create and assign tasks; assigned staff can update task status; handoffs are checked against receiving workspace membership.

This is the shared operations foundation, not a claim that every domain-specific workflow is complete. Shipment tracking, customs status, finance reconciliation, compliance decisions, customer cases, inspection evidence and marketing publication remain in their respective domain services and permissions. Tasks reference those records; they do not independently change payments, letters of credit, shipments or verification outcomes.
