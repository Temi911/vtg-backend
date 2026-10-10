# VTG Automatic Theme Standard

This is the required theme behavior for every Vintage Trade Global page, including new pages.

## Theme schedule
- Use the visitor's browser/device local time, never server time or a fixed Nigerian time zone.
- Light mode from 06:00 inclusive to 18:00 exclusive.
- Dark mode from 18:00 inclusive to 06:00 exclusive.
- Re-evaluate while a page remains open and when the tab becomes visible or receives focus.

## Implementation
- Include the shared controller near the end of each HTML page:
  `<script src="/vtg-site-navigation.js?v=20261010-auto-theme" defer></script>`
- The controller sets `<html data-theme="light|dark">`, `color-scheme`, and emits `vtg:themechange`.
- Do not initialize the theme from `localStorage`, system preference, or a fixed hard-coded theme. Do not add a manual toggle that can override the local-time schedule.
- Use CSS variables for page surfaces, text, muted text, borders, cards, forms, and navigation, and provide both `html[data-theme="light"]` and `html[data-theme="dark"]` styling where needed.
- Preserve VTG branding, the logo, imagery, chart/map legibility, status colors, and accessible contrast in both themes.
- If a page has custom theme styling, it must listen to the shared `data-theme` attribute rather than implementing a separate clock or saved preference.

## Acceptance checks
1. Set the device clock to a daytime hour and load the page: light mode is applied.
2. Set the device clock to an evening/night hour and load the page: dark mode is applied.
3. Keep a page open across a theme boundary: the page changes without a reload.
4. Check forms, dropdowns, tables, dialogs, cards, navigation, and footer in both modes.
5. Check new pages on mobile and desktop before marking them complete.
