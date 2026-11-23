# VTG Commercial Readiness Roadmap

**Product direction:** VTG — The Private Trade House  
**Market strategy:** Africa-first, Nigeria initial operating market, connected to China, South Korea and wider global supply markets.  
**Backend:** Supabase only. Railway is not part of this roadmap.

## Operating rule

Ship dependable trade services in a sequence. Do not create demo suppliers, products, quotes, orders, payments, shipments, reviews or trade history to make the platform look active. Public-facing data must be real, consented, evidence-backed and clearly labelled by source and freshness.

## Baseline audit — 23 November 2026

The linked Supabase project currently reports zero rows in:
- `supplier_profiles`
- `products`
- `buyer_trade_requests`
- `supplier_trade_quotations`
- `trade_quotes`
- `trade_orders`
- `shipments`
- `vtg_inspection_requests`

The database already has the core entities for sourcing, quotations, negotiation, orders, milestones, shipments and inspection. The work should connect and harden these existing entities rather than create a parallel transaction model.

**Important architecture finding:** the current code contains two quote paths: marketplace `trade_quotes` linked to `trade_orders`, and a separate sourcing workflow using `buyer_trade_requests` with `supplier_trade_quotations`. Priority 2 must reconcile these into one clearly mapped lifecycle, with one canonical order and auditable references. Do not silently assume the two paths are interchangeable.

**Payment and fulfilment audit:** the order-payment endpoint currently creates an idempotent `vtg_payment_intents` record and explicitly returns `provider_connected: false`; it does not collect or confirm trade-order funds. Inspection payments have a separate provider/webhook path. A supplier shipment-save RPC already writes shipment events and buyer notifications, but the end-to-end workflow still needs proof from accepted quotation through payment confirmation, shipment, delivery evidence and buyer confirmation.

## Priority 1 — Real supplier density

### Deliverables
- Supplier application and evidence upload.
- Evidence-backed verification levels: Registered Business, VTG Verified, Production Verified and Trade Performance Reviewed.
- Admin review queue, private review history, expiry checks and supplier-visible decision summaries.
- Product listing review before publication.
- Buyer-facing supplier identity and precise verification-level labels.
- Supplier directory and marketplace must show only eligible, approved records.

### Acceptance gates
- A supplier cannot award a verification level to itself.
- Each awarded level is supported by current reviewed evidence.
- A product is visible only when active, approved and attached to an eligible verified supplier.
- RFQ product selection uses the same approved public catalogue as the marketplace.
- Empty catalogue states remain honest and useful.
- Real supplier recruitment and business verification are completed by authorised people; no seeded fake businesses.

## Priority 2 — One complete transaction journey

### Deliverables
Connect the existing entities into one auditable journey:

1. Buyer submits a sourcing request.
2. Eligible suppliers receive and respond with quotations.
3. Buyer and supplier negotiate with recorded changes.
4. Buyer accepts a valid quotation and a confirmed order is created.
5. Payment is initiated and confirmed by the selected authorised payment provider.
6. Shipment and logistics milestones are recorded with source and timestamp.
7. Delivery evidence and buyer confirmation are recorded.
8. Disputes and corrections are tracked without silently rewriting the transaction history.

### Acceptance gates
- Every stage is tied to the same buyer, supplier, request, quote and order identifiers.
- State transitions are validated server-side and role-scoped.
- Duplicate submissions and repeated payment webhooks are idempotent.
- Payment states distinguish initiated, pending, confirmed, failed and refunded; a browser redirect is not proof of payment.
- VTG does not claim escrow, custody, guaranteed refunds or Trade Assurance until a properly authorised partner, contracts and operating process exist.
- Every important state change creates an audit event.
- A full end-to-end test passes with isolated test accounts and provider test mode before any live pilot.

## Priority 3 — Nigeria trade execution

### Deliverables
- Nigeria-specific shipment and import documentation checklist.
- Port and clearing coordination records for Tin Can Island, Apapa and Lekki where relevant.
- Roles and responsibility matrix for buyer, supplier, clearing agent, logistics provider and VTG support.
- Milestone tracking for documents, arrival, clearance, examination, release and delivery.
- Local support escalation and evidence upload.

### Acceptance gates
- Requirements are sourced from current official Nigerian authorities or qualified professionals.
- A checklist distinguishes general guidance from shipment-specific requirements.
- No clearance, customs, legal or delivery outcome is promised by VTG unless confirmed by the responsible provider.
- The workflow records who is responsible for each action and its evidence.

## Priority 4 — Trust and accountability

### Deliverables
- Supplier verification history and evidence expiry.
- Product review and change history.
- Transaction records and counterparty-linked performance evidence.
- Dispute case intake, evidence collection, assigned owner, response windows and resolution record.
- Clear service boundaries and transparent fees.

### Acceptance gates
- Verification is not represented as a guarantee of a specific transaction.
- Ratings or performance indicators are based on completed, attributable records and disclosed methodology.
- Disputes preserve both parties' submissions and decision history.
- Sensitive evidence is private, access-controlled and retained only under a defined policy.

## Priority 5 — Useful trade intelligence

### Deliverables
- Company and product intelligence from verified supplier profiles and catalogue records.
- Trade-flow and price observations from official/open or licensed sources.
- Source registry, update timestamp, geography, coverage, unit, currency and data-quality label.
- AI summaries that cite source records and clearly distinguish historical, indicative, estimated and live information.

### Acceptance gates
- Historical customs unit values are not presented as current market prices.
- Every external observation identifies its source and last-updated date.
- No live integration is advertised until its feed is tested and freshness monitored.
- AI cannot invent supplier identities, product availability, quotes, regulatory requirements or logistics events.

## Priority 6 — African market activation

### Deliverables
- Preserve the country registry and all 54 African markets.
- Nigeria remains the first active operating market.
- Activate additional countries only with local supplier coverage, regulations, payment/logistics options, support and data provenance.
- Add country-specific trade checklists without hard-coding Nigeria assumptions into the wider platform.

### Acceptance gates
- Each country has a named operational owner and readiness checklist.
- Market status distinguishes planned, active and paused.
- No country is presented as operational merely because it exists in the database.

## Delivery sequence

| Release | Scope | Exit condition |
|---|---|---|
| R1 | Supplier verification and public trust labels | CI passes; evidence-gated review works; catalogue/RFQ use the same eligible listing set |
| R2 | Transaction state machine | Sourcing-to-order journey passes end-to-end tests |
| R3 | Payment and shipment evidence | Provider-confirmed payment and traceable shipment milestones work in test mode |
| R4 | Nigeria execution workspace | Checklists, owners, evidence and escalation work for a real pilot |
| R5 | Trust and dispute operations | Admin review, case records and performance evidence are auditable |
| R6 | Trade intelligence | Sources, freshness and AI provenance are visible |
| R7 | Next African market | Country readiness gates are met before activation |

## Commercial operating measures

Track these from real records, not manually inflated counters:
- Approved active suppliers.
- Approved active product listings.
- Supplier response rate and median quote response time.
- Buyer requests receiving at least one valid quote.
- Quote-to-order conversion.
- Confirmed orders and completed deliveries.
- On-time milestone completion, where timestamps are verified.
- Open disputes, resolution time and outcomes.
- Data-source freshness and failed ingestion runs.

**Current status:** R1 implementation is in progress in PR #100. Its CI must pass and the change must be reviewed and merged before it is considered part of `main`. A real supplier onboarding pilot still requires legitimate supplier participation and human verification.
