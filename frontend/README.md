# VTG frontend migration notes

The existing `frontend-v3.html` remains the application source of truth while the frontend is being consolidated.

Performance helpers in `performance-loader.js` provide reusable lazy-loading primitives for the map, AI, news and below-the-fold media. Do not create additional `frontend-v5`, `frontend-v6`, etc. files for feature work.

Migration rule: make small, testable changes to the existing application, preserve current functionality, and only change Vercel's `/` route after the canonical frontend has been verified.
