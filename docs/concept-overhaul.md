# Concept implementation — 7 October 2026

## Direction contract

Operate mode. Approved light/dark PNG concepts govern the visual world. Graphite instrument rail (76px), paper #f5f6f2 / charcoal #1b1d19 canvas, pearl/sage grouped work surfaces, lime #e4f7a7 selection, amber only for attention. Inter remains self-hosted. Four-pixel spacing unit, 20–24px illustration-to-title gap, 28px main surfaces, 16px controls, pills for navigation. Original dish, assay, vessel and document SVGs are decorative and never represent measured values.

Stable text/tables/forms; depth belongs to graphics and controls. Press 100ms; selectors 180ms; panels/dialogs 220ms; single connector pulse 550ms. CSS transform/opacity, no new motion library. Reduced motion, touch, save-data and existing constrained-device detection suppress spatial effects; visibility pauses motion. Focus and actions do not wait for animation.

## Pre-change baseline

Local Vite demo, Chromium, 1586×992, dark. Warm reload: DOMContentLoaded 138.9ms, load 141.8ms; 3,845,218 encoded resource bytes (development modules), 392 DOM nodes; 30 animations sampled immediately after render, 11 infinite decorative animations. Cold first request included Vite dependency optimization (23.7s), unsuitable for comparison. No document overflow. Screenshot: output/playwright/concept-baseline.png. Compare warm reloads on the same development server; numbers are observations, not production benchmarks.

## Route and state inventory

| Route | Existing actions and branches retained | Verification target |
|---|---|---|
| / | Recent samples/open drafts, local text/type/status filters, intake/source/report navigation | New selected-sample workflow; real related draft; connectors and switches; actions and queue filters |
| /new | Seven configured types; one/batch entry; choose/edit/review/outcome; required fields, optional suggestions; prepare/reserve/cancel/commit/retry; occupied/conflict/uncertain writes; Ctrl+Enter; unsaved guard | Type selection, invalid and valid entry, batch rows, assigned-number review, cancellation |
| /samples | All-month search; category/status/date; sort; visible columns; pagination; refresh; duplicate sources | Filters, sorting, columns, empty and available records |
| /samples/:id | Identity, source fields/location/history; external sheet link; existing draft links; prepare report | Real record and missing-record error |
| /worksheet | Configured type filters, multi-column query/sort, pagination; notes; admin layout unlock/order/visibility/shared save | Filters, sorting, note editor, layout controls, responsive local scrolling |
| /reports | Logged sample selection, automatic setup, source/specification/template resolution, create confirmation, saved draft selection/deletion | Draft selection, real setup and dialog; no implicit approval |
| /reports/:id | Entry/review; numeric/finding/not-tested/not-entered; provenance; dates and metadata; save/revision conflict; history; generate/preview/download; dirty guard | Result states, review, history, saved/unsaved/disabled; missing record |
| /library | Search, kind/order/pagination; preview/download/Drive link; admin live refresh and report sync | Search, type, empty, dialog, close/focus restoration |
| /assistant | Conversations, new chat, send, loading/failure, record links; floating chat | New conversation and demo response; stable accessible composer |
| /settings | Administrator gate; general/types/fields/products/tests/specifications/lookups/numbers/reports/appearance/connections/references/templates/people/audit; entity selection/add/edit; validated revision save and confirmation; unsaved guard | Every section; configuration inputs and dialog without committing shared settings |
| * | Not found with dashboard recovery | Recovery link |
| Entry/auth | Google sign-in, allowlist/viewer access note, session-expired and load-error retry | Isolated simulated auth and failure responses; no live authentication changes |

Shared: lazy loading, errors, empty states, disabled/read-only access, theme persistence, global search Ctrl+K/Escape, mobile navigation, sync status and notifications, deployment notice. Live Google writes, real credentials, document signing and release are outside demo verification. Source statuses are displayed exactly as stored.

## Implementation and audit evidence

### Rendered routes and interactions

All eleven route families in the inventory were rendered at 1440px desktop and 390px mobile in both themes: 44 screenshots, named `output/playwright/final-{route}-{desktop|mobile}-{light|dark}.png`. Six principal routes also passed a 768px overflow check. No document overflow or uncaught page errors were observed in the route sweep. Wide worksheet/table content retains local scrolling. Representative tablet capture: `output/playwright/final-dashboard-tablet.png`.

Exercised in the demo: related/unrelated selected samples, real draft counts and absent-draft states; connection/motion switches; queue search, no matches, type/sort/column controls; mobile touch navigation; single and two-row batch intake validation, assigned-number review and cancellation; result not-tested/reason and not-entered branches, unsaved/review/history states; library kind/search/empty/preview and Escape; worksheet notes and layout unlock/relock without saving; all fifteen settings sections; assistant conversation/reset and missing-configuration error; missing sample/draft errors. Ctrl+K, arrow-key search navigation, Escape, dialog focus restoration, mobile focus trapping and theme switching were exercised. Intake reservations were canceled; shared configuration was not committed.

Isolated browser contexts simulated viewer permission denial, expired authentication, service-load failure/retry, reduced motion and constrained devices (two cores/save-data). Reduced-motion contexts had no running animations. Constrained contexts suppressed connector/spatial effects. The Google sign-in entry was rendered; live OAuth was not attempted.

The demo lacks Gemini credentials and a required applicable-test checklist row for automatic report setup. Those paths show the actual error or disabled action. Live Google writes, report generation/download against configured integrations, conflict/occupied/uncertain-write responses, real signing and sample release remain unverified. Source inventory records retained branches, not a claim that every server state was exercised.

Recordings: `output/playwright/concept-recordings/page@182805a79d8700183de49c40c8ef7c11.webm` (desktop workspace/search/theme) and `page@a2ded88a3ac4f865265a5f756b80c664.webm` (mobile touch intake/review/cancel/search). Additional state captures: `concept-auth-mobile.png`, `concept-intake-review-mobile.png`, `concept-report-review-mobile.png`.

### Audit and corrections

Impeccable critique/audit and a separate finish reviewer inspected source and representative rendered captures. Significant corrections: mobile backdrop stacking blocked taps (fixed and recorded with actual touch); pending dashboard search overwrote a changed filter/sort (effect dependencies corrected); assistant autofocus/initial scrolling displaced the mobile page (removed); form labels included select-option text (explicit accessible label IDs); hidden sign-in canvas kept scheduling frames (mount and unused implementation removed); relationship connectors now require actual related records. Typography, 22px graphic/title spacing, light/dark treatments and responsive density passed the bounded visual review. No broad redesign was requested by the finish reviewer.

The one Impeccable detector run found advisory token drift against the previous DESIGN.md. The approved overhaul intentionally changes that world; refreshed DESIGN.md and the design sidecar describe the actual final token layer rather than enforcing obsolete colors/radii. No second detector run was used as a substitute for visual inspection.

### Compilation, tests and performance

TypeScript and the production Vite build passed. Existing automated suite: 72/75 passed; three failures remain in unchanged backend expectations: duplicate product-name configuration validation, report-template date formatting (ISO versus displayed date), and applicability expectations for Omega/Herbycin. Full output: `output/playwright/concept-tests.txt`. Backend files were not modified to mask these failures.

Same-server warm development reloads after implementation: DOMContentLoaded 255.8/258.8/238.1ms (median 255.8ms), load 261.4/263.9/242.3ms; 638 DOM nodes; zero infinite animations and zero running animations after settling. Against the pre-change 138.9ms warm DOMContentLoaded observation, the median was 116.9ms slower. Encoded resource bytes ranged 2,849,962–3,994,170 depending on cache, versus baseline 3,845,218; the largest observed increase was 148,952 bytes (3.9%). These development/cache-sensitive measurements do not establish production speed improvement. Removing eleven continuous decorative loops reduces idle animation work; it does not justify claiming faster page loading.

No new dependencies or motion runtime. Final production bundle: main JS 470.71KB (142.49KB gzip), CSS 191.79KB (35.63KB gzip), with existing lazy route chunks. No live deployment performed. The development preview remains available at http://localhost:5173/.

Final independent finish-review verdict: resolved, ship. No material finding remained within the bounded source/representative-capture review. TypeScript and production build were rerun after the auth/connector corrections; browser recheck confirmed absent-draft connectors are hidden and authentication mounts no canvas and has zero running animations after settling.

### Density correction requested by user

The concept implementation felt too zoomed in. Reduced the desktop header from 100px to 76px, maximum heading from 36px to 28px, illustrations to 88×64px, panel padding, action-tile padding and table-row spacing. Removed the inherited 38px dashboard section gap in favor of 16px. Body/control text remains readable; mobile touch controls retain 44px minimum targets. At 1280px, actions now remain alongside workflow panels instead of creating an unnecessary additional row.

Browser checked dashboard at 1586/1280/768/390px and intake, sample search, reports, library and settings at 1440/390px: no document overflow. Workflow selection and switches still operate. Screenshots: `output/playwright/density-{1586|1280|768|390}.png`. At 1586px the workflow decreased from approximately 515px to 439px. TypeScript passes. Independent Impeccable finish review found no significant clipping, overlap, illegibility or spacing defect in the representative captures.
