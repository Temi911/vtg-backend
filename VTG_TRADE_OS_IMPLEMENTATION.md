# VTG Trade OS — Implementation Blueprint

## Product position
VTG is an Africa-focused digital trade operating system connecting buyers, suppliers, trade operations, logistics, documents, compliance and approved financial/payment partners.

## Core product surfaces

### 1. Marketplace
- Multi-category product discovery
- Supplier storefronts
- Verified supplier signals
- Product enquiries
- Trade feed
- Supplier following
- Buyer/supplier messaging
- Video-call workflow

### 2. Trade Intelligence
- Country-to-country trade context
- Product/category intelligence
- HS-code assistance
- Regulatory-agency mapping
- Required-document checklist
- Freight and landed-cost estimation
- FX intelligence
- Trade news and signals
- Trade Atlas

### 3. Trade Room
One workspace per transaction:
- Buyer
- Supplier
- Order
- Quote/commercial terms
- Messages
- Documents
- Payment status
- Letter of Credit status
- Freight/shipping
- Customs/clearance
- Delivery milestones
- Audit history

### 4. Document Centre
- Upload and organize transaction documents
- Required/missing/pending/verified states
- Role-based access
- Review/audit trail
- Secure sharing
- Document expiry reminders
- Country/product-specific checklists

### 5. Africa Network
Launch from Nigeria, then expand through West, East, Southern and North Africa.
Use country/route/port/supplier/buyer layers rather than treating VTG as a single-country marketplace.

### 6. Supplier Trust
- Business verification
- Supplier profile
- Product verification signals
- Company documents
- Ratings/reviews
- Transaction history
- Risk flags
- Verification status with clear provenance

### 7. Payments & finance
VTG should initially integrate licensed providers rather than perform regulated financial activity without the required authorization.
- Payment collection/settlement integrations
- Letter of Credit workflows
- Trade-finance partner workflows
- FX information
- Crypto market information
- Transaction status
- Reconciliation

### 8. Logistics & clearance
- Freight options
- Shipment milestones
- Port/route information
- Customs/clearance workflow
- FGR clearing/forwarding integration
- Door-to-door delivery coordination
- Proof of delivery

### 9. AI Trade Engine
The AI should answer questions in transaction context and show what is known, what is estimated, what source/authority should be checked, what documents may be required, and what action the user should take next.

Example: China → Nigeria + solar panels + 500 units → trade brief + document checklist + landed-cost range + supplier comparison + next actions.

## Existing backend foundations identified
The current repository already contains foundations for:
- Buyer/supplier/bank authentication
- Supplier storefronts
- Products
- Orders
- Letter-of-Credit workflow
- Messaging/conversations
- Trade feed
- Enquiries
- Support tickets
- Video calls
- Supplier following
- Trade Atlas/map work

The new Trade OS should extend these foundations instead of rebuilding them.

## Build order
### Phase 1 — Command centre
- Trade OS navigation
- Trade Room
- Document Centre
- Trade Intelligence
- Africa Network
- Supplier Trust views

### Phase 2 — Real data
**Current execution focus:** connect the command centre to the existing authenticated marketplace, orders, LC, messaging, calls and trade-feed foundations. No parallel mock business logic should be introduced where an existing API can be reused.
- Connect existing marketplace/order/auth APIs
- Connect existing LC, messaging and call workflows
- Persist Trade Room state
- Add document metadata and permissions

### Phase 3 — Intelligence
**Current execution focus:** establish a single Trade Intelligence data contract so country rules, HS/tariff data, freight, FX and landed-cost outputs can be displayed consistently across Trade OS, Marketplace and Trade Room.
- Country rules
- HS/tariff data
- Regulatory sources
- Freight data
- Landed-cost engine
- FX/market data

### Phase 4 — Trust and compliance
**Current execution focus:** make verification status, provenance, permissions and audit events first-class objects in Trade OS before exposing higher-risk automation.
- KYC/KYB workflow
- Verification states
- Risk flags
- Audit trail
- Data-protection controls

### Phase 5 — Partner integrations
**Current execution focus:** define provider adapters and status contracts first; keep regulated payment/finance execution with appropriately licensed partners.
- Banks/payment providers
- Logistics/freight
- Customs/trade data sources
- Insurance
- Trade-finance partners

### Phase 6 — Africa scale
- Country-specific configurations
- Regional representatives
- More ports/routes
- Local currencies
- Country-specific document and regulatory requirements

## Protected frontend rule
frontend-v3.html is a restored protected file. Do not modify it unless the owner explicitly reviews the exact proposed changes and confirms them first. New functionality can be developed in separate files/modules until approval is received.

## Current prototype
trade-os.html is the first standalone VTG Trade OS command-centre prototype. It intentionally does not alter frontend-v3.html.