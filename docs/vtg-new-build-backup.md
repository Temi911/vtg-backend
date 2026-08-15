# Vintage Trade Global — New Build Backup

**Backup date:** 2026-08-16
**Status:** New website build from scratch; this document is the source-of-truth specification before implementation.

## Brand
- Business: Vintage Trade Global (VTG)
- Positioning: Africa Trade Platform
- Primary visual direction: blue VTG patterned V, premium corporate trade-platform aesthetic, white/navy/bright-blue with restrained gold accents.
- Uploaded website/dashboard images are design references, not flyers.

## Core platform
- Multi-product global trade marketplace; NOT vehicle-only.
- Product categories must support vehicles and auto parts, industrial machinery/equipment, electronics/technology, agriculture/agro equipment, pharmaceuticals/medical supplies, construction/building materials/equipment, textiles/consumer goods, and future categories.
- Buyer and supplier experiences.
- Supplier directory and supplier profiles.
- Marketplace/product discovery.
- Trade services and logistics services.

## Intelligence and AI
- AI trade assistant with intelligent answers about products, importing/exporting, customs, shipping, logistics, ports, airports, airfreight, African markets, China and South Korea.
- Live/current trade context where available.
- AI should not expose fake fallback responses such as “temporarily unable to connect” as its normal behavior.
- Trade/news intelligence feed.
- News cards must use relevant article imagery; source image first, suitable fallback/automatically generated visual when source has no image.
- Africa-specific intelligence.

## Trade tools
- Landed-cost/import calculator.
- Shipping and airfreight cost components.
- Currency/live exchange-rate tools.
- Trade cart.
- Calculator must have one primary expandable UI; no duplicate calculator at the bottom.

## Trade Atlas
- Interactive global logistics/trade map.
- Africa-wide country intelligence.
- Nigeria-specific logistics coverage.
- China connections.
- South Korea connections.
- Sea ports and terminals.
- Airports and cargo hubs.
- Logistics hubs.
- Trade hubs.
- Shipping routes.
- Air-freight routes.
- User-controlled layer toggles: Countries, Ports & Logistics, Trade Hubs, Trade Routes, Airports, Air Routes, etc.
- Layers must start in an intentional state and be independently selectable/deselectable.
- 2D and 3D modes.
- Standard and Satellite modes.
- Search.
- Geolocation.
- Fullscreen.
- Zoom and north reset.
- Distance measurement.
- Interactive information popups.
- Map must resize correctly so details remain visible.
- Satellite mode must preserve feature overlays.
- Map controls and close/cancel controls must work.

## Website UX
- Professional, beautiful, attractive, responsive dashboard/marketplace aesthetic matching the supplied references.
- Strong landing hero with VTG branding and global trade/logistics imagery.
- Multiple visual cards/panels rather than a brochure-only layout.
- Live market overview and exchange-rate widgets.
- Marketplace, suppliers, buyers, services, trade intelligence, Atlas, calculator and AI access from clear navigation.
- News, suppliers and routes should appear as useful dashboard modules.
- Mobile and desktop responsive behavior.

## Recovery / version-control rule
- Do NOT recreate or overwrite the existing VTG project when working on the new build unless explicitly requested.
- Every meaningful code change must be committed to GitHub.
- Before major changes, create a checkpoint commit/branch.
- Keep a dated recovery branch/tag for each major milestone.
- Never replace a known-good frontend with an older frontend without an explicit checkpoint and verification.
- The new build should eventually have its own clean GitHub source-of-truth repository/branch and deployment.

## Design references
The user supplied reference images showing:
1. Blue VTG patterned V logo with “VINTAGE TRADE GLOBAL / AFRICA TRADE PLATFORM”.
2. Professional multi-panel website/dashboard composition.
3. Windows-style information/news dashboard cards.
4. Blue 3D AI assistant/chatbot visual.
5. Global news visual.
6. Satellite Earth/global logistics visual.

These references establish the visual direction of the website, not a flyer design.
