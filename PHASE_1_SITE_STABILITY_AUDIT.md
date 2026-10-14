# Phase 1 — Site Stability Audit

Branch: `phase-1-site-stability`

## Changes implemented in this branch

- Restored the VTG AI item in the shared footer and preserved the red active-page indicator.
- Changed the shared Trade Workspace footer entry to the existing sign-in entry rather than a nonexistent `trade-workspace.html` page.
- Aligned automatic theme switching with the documented local-time schedule: light from 06:00 to 17:59 and dark from 18:00 to 05:59.
- Synchronized the sign-in page's theme toggle with the shared saved theme preference so the shared controller does not overwrite the user's choice.
- Added the shared navigation/footer/theme controller to `account-help.html`.
- Repaired references to the nonexistent `trade-os.html` route across the landing page, marketplace, AI dashboard, public information pages, trade feed, verification pages, signup flow, and related backend email/redirect flows.
- Routed buyer entry and default buyer signup/agreement flows to the existing `buyer-dashboard.html`; routed supplier/bank verification-related entry points to the existing `verification.html` page.
- Removed the obsolete “How VTG Works” item from the static agent footer markup.

## Source checks performed

- Confirmed that the edited navigation script contains the VTG AI footer link, a valid Trade Workspace destination, and the 18:00 theme boundary.
- Re-fetched edited files from the branch and checked key route replacements, malformed link markup, and sign-in return handling.
- Checked root-page HTML link references across the audited pages; the known dead `trade-os.html` and `trade-workspace.html` destinations were corrected in the files identified during this pass.

## Remaining go-live checks

1. Run a browser-based smoke test on desktop and mobile in both themes.
2. Preview build: Vercel reports the branch deployment as READY and the build log says “Deployment completed.” A browser-level smoke test is still outstanding; the preview could not be inspected through the available browser-fetch tools.
3. Check the authentic brand asset with the owner. The repository currently contains only `assets/vtg-logo.svg`; the specifically requested red transparent PNG is not present in the repository tree, so it was not fabricated or substituted.
4. Exercise sign-in, signup, verification, and role redirects against the live staging API, not only source-level checks.

Do not mark Phase 1 production-ready until the deployment and browser checks above pass.
