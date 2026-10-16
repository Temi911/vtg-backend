# VTG Theme and Interface Standard

The landing page and all non-dashboard public pages use the shared day/night and visitor-preset system without changing the landing-page layout. Buyer and supplier dashboards are excluded from this shared refresh. User/workspace pages that already offer ten workspace presets keep those presets.

## Appearance schedule
- Use the visitor's browser/device local time, never server time or a fixed Nigerian time zone.
- Light mode from 06:00 inclusive to 18:00 exclusive; dark mode from 18:00 inclusive to 06:00 exclusive.
- Re-evaluate while a page remains open and when the tab becomes visible or receives focus.
- The existing Appearance control continues to offer Automatic (local time), Light, and Dark. A manual Light/Dark selection takes precedence until reset to Automatic.

## Three visitor themes
Public pages offer three visual presets:
1. Trade Classic — VTG red, familiar brand-forward appearance.
2. Ocean Route — ocean blue and teal.
3. Graphite Port — graphite and steel.

## Ten workspace themes
Workspace pages offer ten visual presets:
1. Executive
2. Ocean Finance
3. Emerald Trade
4. Copper Ledger
5. Indigo Intelligence
6. Crimson Operations
7. Monochrome Pro
8. Sandstone
9. Arctic Blue
10. Midnight Harbor

Presets change the accent palette, links, primary controls, and focus color. The day/night schedule still controls surface and text contrast. Visitor and workspace selections are saved separately in local storage on the current browser; they are not account-synced.

## Implementation
- The shared controller is /vtg-site-navigation.js; it sets the html data-theme attribute, color-scheme, emits vtg:themechange, swaps the dark-text and light-text VTG logos, and renders the shared header/footer and appearance controls on non-excluded pages.
- The preset controller sets data-vtg-skin and stores visitor/workspace preferences separately so visitor presets follow public pages and workspace presets follow user/workspace pages.
- Use CSS variables for page surfaces, text, muted text, borders, cards, forms, and navigation. Provide both light and dark styling.
- Preserve the actual VTG logo, images, carousel structure, map controls, chart legibility, status colors, and accessible contrast.
- Custom theme styling must follow the shared data-theme attribute rather than creating a separate clock or unrelated saved preference.
- The buyer-dashboard.html, buyer-dashboard-preview.html, and supplier-dashboard.html must not receive the shared preset control or shared interface stylesheet during this refresh. The landing page receives theme/logo/preset support while keeping its approved layout intact.

## Repository cleanup policy
- Keep only code that active pages or application/runtime tests reference in the active tree.
- Legacy copies were backed up on branch archive-backup-before-cleanup-2026-10-16 before unused legacy JavaScript and the deprecated archived landing-page copy were removed from main.
- Keep operational documentation and restoration notes unless they are independently proven obsolete.

## Acceptance checks
1. Device-local daytime loads light mode; device-local nighttime loads dark mode.
2. An open tab re-evaluates the theme at the time boundary, on focus, and when visible again.
3. Visitors can select all three public presets; workspace users can select all ten workspace presets.
4. Forms, dropdowns, tables, dialogs, cards, navigation, footer, and focus states remain readable in both day/night modes.
5. Atlas must use a real interactive geographic map with real coordinates and an external map tile service; a decorative SVG is not the primary map.
6. Check pages on mobile and desktop before marking them complete.
