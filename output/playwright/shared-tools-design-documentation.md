# Shared tools: implementation design record

This is a scoped, code-led record of the Kanban and Excalidraw extension within the existing IPI Laboratory Workbench. It does not establish a new visual world or change `DESIGN.md` or `.impeccable/design.json`.

Sources checked: `.agents/skills/impeccable/reference/document.md`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `src/styles.css`, `src/laboratory.css`, `src/ui.tsx`, `src/collaboration.tsx`, `src/collaboration.css`, `src/kanban.tsx`, `src/drawing.tsx`, `shared/collaboration.ts`, `docs/shared-tools.md`, and `output/playwright/shared-tools-audit.md`. This document records source evidence; no browser was run by the documenter. Previously reported browser and profiling results remain attributed to the audit and shared-tools guide.

## Five-line system summary

1. The incumbent Laboratory Workbench remains the authority: paper/charcoal working fields, graphite navigation, moss focus and soft lime actions.
2. Existing PageTitle, Field, Dialog, ErrorBox, buttons, icon buttons and Lucide icons carry the extension; resource rows and flat lanes avoid repeated panel nesting.
3. Inherited Inter and compact 12/13/14px roles, 24–28px editor titles, and existing 12/16/22px radius vocabulary match the established system.
4. Content uses four scoped sticky paper/ink pairs; Excalidraw retains its upstream canvas UI with bounded moss/lime overrides and the application theme.
5. Motion stays interaction-bound: a 180ms detail reveal, existing control feedback and drag positioning, with explicit reduced-motion, motion-off and low-performance hooks.

## Incumbent comparison

| Aspect | Incumbent evidence | Extension evidence |
| --- | --- | --- |
| Identity | DESIGN.md names the Laboratory Workbench; final laboratory.css layer supplies paper/lime/graphite colors. | Shared tools uses the existing shell and shared UI exports. No replacement global palette or font stack is introduced. |
| Hierarchy | Compact Inter headline/control/label hierarchy; alignment and tonal grouping. | Resource links are 14px/600 with secondary metadata; editor titles use clamp(24px, 2vw, 28px); lane and note titles are 14px, body 13px, attribution 12px. |
| Shapes | Field 12px, control 16px, workflow-panel 22px, panel 28px. | Sticky notes/color choices use 12px; inline detail and desktop canvas use 22px; mobile canvas uses 16px. Shared buttons and fields retain incumbent styling. These are task-level applications of existing sizes. |
| Boundaries/depth | Quiet borders, flat panels; depth reserved for bounded floating states. | Rows and lane headings use subtle rules; lanes have no enclosing panel fill at rest. Only the active dragged note adds 0 12px 24px var(--border-strong) shadow and .75 opacity. |
| Layout | Dense operational information, responsive working surfaces. | Initial board has To do / In progress / Done, but columns can be added, renamed and moved. Lanes grow from 260px to a 340px maximum, separated by 20px; details sit alongside with 24px gap. |
| Controls/access | Existing labeled fields, focus, safe primary actions, modal dialogs. | Uses Field and Dialog for note/column/resource editing; viewer details use readOnly inputs; editor actions and grips are gated by canEdit. Drawing uses viewModeEnabled for viewers. |

## Scoped content colors

Sticky-note colors identify note content, rather than approval, laboratory result status or a new app-wide accent. The same explicit dark ink remains paired with each paper color in light and dark themes. Color controls include text names and aria-pressed selection; focus outlines inside notes use sticky ink.

| Scope | Paper | Ink |
| --- | --- | --- |
| sticky-paper | #eef0e8 | #30362a |
| sticky-sage | #dce8d4 | #2c4229 |
| sticky-amber | #f5e8c8 | #534326 |
| sticky-blue | #dce8ef | #2e4351 |

These local pairs are evidence from collaboration.css, not added normative tokens. Contrast certification is outside this source scan; the audit leaves full dark contrast review open.

Excalidraw imports upstream index.css and retains its native tool layout, geometry and drawing font choices. Drawing receives the IPI theme prop and initializes the canvas to #242621 in dark mode or #fcfcf9 in light mode. The higher-specificity shared-drawing override sets moss primary #52652a, darker/hover #3d4e1e, darkest #303e17, lime container/light #e4f7a7, lime hover #d9ef96, and graphite container ink #20241b. These are editor-scoped overrides; the canvas is not documented as fully restyled IPI controls. Automatic PNG checkpoints explicitly use the light #fcfcf9 paper background. Fonts are served from /excalidraw/ rather than a public CDN.

## Layout, vectors and motion

The details panel is an inline aside, 310px wide on desktop and 280px below 1100px. At 767px and below it becomes full-width above the board. Horizontal lane scrolling is local, uses proximity snapping, and is paired with a mobile Jump to column select. Each lane has a separate vertical note viewport capped at min(60dvh, 600px). Note previews clamp to six lines; opening details exposes the body in the existing labeled textarea. Explicit Move up/down and column selection remain available alongside pointer and keyboard drag sensors.

The drawing is a large clipped working area: calc(100dvh - 310px), minimum 480px and maximum 1000px; mobile uses 65dvh with a 420px minimum. Fit drawing uses animate:false and leaves tool/canvas offsets. Import, Fit drawing, PNG and SVG actions use existing secondary button styling. Viewers retain export and fit controls while import/clear are editor-only.

The empty state BoardGraphic is an inline aria-hidden SVG of three lanes and notes, using currentColor. It describes the resource affordance without fabricated data. Fine-pointer hover lifts that graphic 3px over 180ms. The detail panel enters over 180ms cubic-bezier(.22,.8,.25,1), changing opacity .7 to 1 and horizontal offset 6px to zero. Reduced-motion disables that animation and graphic transitions; motion-off and app-low-performance also disable panel/graphic movement. Existing shared control reduced-motion behavior remains inherited. Dnd-kit supplies inline drag transforms/transitions; this source scan does not certify every upstream drag/canvas animation as disabled.

## Collaboration and performance boundaries

The live bar distinguishes connection, participants, IPI save state and Drive checkpoint state. Copy says pan/zoom remain personal. The shared-tools guide defines database-backed live editing, Drive recovery checkpoints, authenticated roles and the single shared workspace. The documenter did not independently verify server guarantees.

Implementation evidence supports measured performance intent: the drawing module is lazy-loaded; note rendering uses a virtualizer with estimateSize 174, overscan 5 and 12px gap; Sticky is memoized; drawing mutations batch for 120ms; preview generation waits 2000ms and postpones while the last interaction is less than 1800ms ago. Remote presence and elements update the upstream editor, while viewport/selection are personal. Final drawing reconciliation skips identical scene echoes and defers remote scene application during an active gesture.

The guide reports a 240-note desktop frame p95 improvement from approximately 461ms to 28ms and mobile approximately 18ms, with isolated desktop drag long tasks remaining. It reports 800-vector desktop p95 approximately 18ms, but mobile under 4x CPU throttle approximately 107ms and pauses up to 519ms. These are recorded stress fixtures, not physical-device or universal 60fps claims. Heap observations are not a leak test. Upstream lazy chunk size warnings remain.

Live Drive writes/failure retry and real-folder restore, multi-instance deployment, active role revocation, physical touch hardware and extended offline/restart recovery remain unverified per docs/shared-tools.md. Local demo disables Drive writes. They are release evidence gaps, not additions to the design system. Final separate-editor browser evidence checks Undo preserving the remote ellipse and Redo restoring the local rectangle; this establishes isolation for separate newly-created shapes only. Simultaneous edits to the same shape need broader testing.

## Findings deliberately not canonized

The initial source scan found undeclared --surface/--surface-elevated/--surface-hover/--success aliases. The implementing agent corrected every occurrence to incumbent --bg-surface/--bg-surface-elevated/--bg-surface-hover/--color-success; the documenter verified those corrected references in collaboration.css. The temporary paint fallback was not canonized as a design rule. The documenter writes only this record. Performance and live-cloud limitations above also remain explicit rather than being promoted into completed-quality claims.


## Final verification update

The final shared-tools guide and implementing agent report `shared-undo-results.log` passing separate-editor Undo/Redo for separate shapes, and `shared-viewer-results.log` passing viewer UI with a mocked session and disabled event stream plus solid light/dark detail backgrounds. Server viewer mutation rejection is verified separately through real API handlers with injected roles. This documenter checked the final drawing reconciliation source and the updated guide; these browser results were not independently rerun by the documenter.

The final production build passed with the upstream lazy-chunk warning. An earlier full suite passed 139/139; the final full suite passed 138/139 because an existing report-artifact recovery test hit a Windows EPERM rename error. Its focused retry passed 3/3. These scopes retain the failed run rather than presenting it as a clean final full-suite pass. DESIGN.md and .impeccable/design.json remain unchanged by this documentation update.
