# Shared tools technical audit

Scope: changed Kanban/Excalidraw routes and collaboration integration in the existing IPI shell. Chrome 154, desktop 1440×1000 and emulated mobile 390×844. Separate browser editor contexts; API tests inject analyst/viewer roles. No physical-device or live Drive claims.

Implementation integrity: coherent extension of the incumbent system. Existing navigation, fields, dialogs, SVG icons and action styles are reused. The one-time detector reported typography/radius advisories and one shadow-color advisory. Those values were aligned to the documented ramp and border token. Sticky color pairs and Excalidraw canvas colors are scoped content/editor semantics, rather than new global design tokens. No generated shipping raster assets.

| Dimension | Score | Evidence / limits |
| --- | --- | --- |
| Accessibility | 3/4 | Labels, focus outlines, keyboard drag sensor, explicit move menus, reduced-motion verified. Full screen-reader and physical touch audits remain open. |
| Performance | 2/4 | Lazy drawing editor, windowed board columns, merged writes, metadata-only presence, idle previews. 800-vector overview under 4× CPU remains slow. |
| Responsive design | 3/4 | Both routes have no document overflow at tested widths; Kanban horizontal overflow is intentional and has a column selector. Physical touch gestures unverified. |
| Theming | 3/4 | Existing tokens; drawing dark-theme state verified; intentional note paper/ink color pairs. Full dark contrast audit remains open. |
| Implementation integrity | 3/4 | Role enforcement and operation journal tested; existing component system preserved. Live cloud and multi-instance checks remain open. |
| Total | 14/20 | Good locally, with explicit release validation remaining. |

Material findings:

- **P1, release validation:** Google Drive checkpoint writes and failure recovery have not been exercised with production credentials/folder. Demo mode disables them. Configure the dedicated folder and validate the setup before claiming cloud delivery complete.
- **P2, performance:** Stress fixture with 800 simple vectors, mobile viewport and 4× CPU throttling has frame p95 around 107 ms. Desktop p95 around 18 ms. Avoid a universal smoothness claim; further canvas profiling and physical-device testing are required.
- **P2, verification:** Active role revocation, collaborative undo isolation, physical touch and multiple backend instances remain unverified. These are recorded in task.md and docs/shared-tools.md.

Resolved during this work: severe 240-note drag stutter (desktop frame p95 approximately 461→28 ms), redundant self-presence canvas updates, eager preview generation during gestures, off-ramp typography/radii, mobile page overflow checks, temporary-disconnection replay and note delete/undo recovery.

Evidence: shared-final-results.log (no page errors, no document overflow, dark mode and reduced motion, disconnected write recovery); shared-performance-results.log (frame intervals, long tasks, heap samples); shared-tools-detector.json (original findings); shared-undo-results.log (undo preserves the remote shape and redo restores the local shape); shared-viewer-results.log (mocked viewer UI and corrected light/dark surface paints); tmp/shared-tools-build.log (build passed with upstream lazy-chunk size warning). An earlier suite passed 139 tests; the final suite passed 138/139 with an existing report-artifact Windows EPERM rename error, and its focused retry passed all three artifact tests. Independent review and the resolved canvas-fit verdict are recorded in shared-tools-finish-review.md and shared-tools-finish-verdict.md.
