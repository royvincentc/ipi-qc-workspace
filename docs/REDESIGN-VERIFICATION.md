# Local redesign verification

Verified October 24, 2026. Preview: http://localhost:5173/; entry page: /login.

## Direction and scope

311796.mp4 supplies the composition and motion reference. No reference PNG, video, or extracted frame is embedded in the application. The replacement shell uses horizontal destinations, an animated active pill, a charcoal utility rail, sage surfaces, local Assistant typography, and a contextual blue summary. The dashboard now separates daily receipts, category mix, receipt summaries, and the searchable logbook. Login has a new split composition. Other workflows share the new controls, form grouping, table treatment, responsive layout, and theme.

Implementation: src/App.tsx, src/ReceptionDashboard.tsx, src/ReceptionChart.tsx, src/Experience.tsx, src/operations.css, src/operations-routes.css, and src/main.tsx. The assistant composer retains an explicit accessible send label. Scientific calculations, criteria, record schemas, report generation, revisions, and authorization remain in their existing implementations.

The local runtime was already available on 5173; duplicate preview processes were stopped. Browser checks confirmed /api/me is a de-identified administrator demo session. Its API process is from the existing Documents/ChatGPT/IPI checkout; frontend 5173 serves this worktree. Google writes are disabled in demo. Demo server and Vite source defaults use loopback; production API binding remains unchanged.

## Route coverage

| Surface | Implemented treatment | Actual browser verification |
|---|---|---|
| Overview / | New composition, timeline, category mix, summary and logbook | 1440 and 390 widths; empty October and populated September; day/search filters; failed refresh and retry |
| Login /login | Split entry page, auth/session/error variants | Desktop and mobile; authenticated demo; mocked 401 Google link; mocked 503 recovery |
| Intake /new | Category chooser and form hierarchy | Desktop/mobile chooser and Finished Goods form; no submission |
| Samples /samples | Search/filter controls and records | Desktop/mobile real demo list |
| Sample /samples/demo-FG | Record grouping and actions | Desktop/mobile real demo record |
| Worksheet /worksheet | Toolbar, table and responsive rows | Desktop/mobile; open note editor without saving |
| Reports /reports | Report workspace and list | Desktop/mobile empty draft state |
| Report /reports/visual-fixture | Shared form/editor styling | Desktop/mobile browser-only fixture; Review report validation |
| Library /library | Resource toolbar and rows | Desktop/mobile available demo state |
| Shared /shared | Shared workspace hierarchy | Desktop/mobile available demo state |
| Assistant /assistant | History, conversation and composer | Desktop/mobile available state; compact controls visually checked; no external assistant request |
| Settings /settings | Navigation and configuration panels | Desktop/mobile administrator view; mocked viewer denied and restricted navigation absent |
| Shared editor /shared/:id | Shared editor selectors included | No resource instance opened; collaborative editing not verified |
| Unknown routes | Existing fallback retained | Not explicitly exercised |

## Checks and evidence

- TypeScript: `npm run lint` passed after final UI fixes.
- Production build: `npm run build -- --configLoader native` passed (4,635 modules). Existing diagram/drawing bundles still trigger the over-500-kB warning; no dependency was added.
- Focused reception/search/dashboard tests: 15 passed.
- Configuration, domain, report purpose/preview/artifact, result remarks and report tests: 86 passed.
- Commands:
  - `npx tsx --test tests/reception.test.ts tests/workflow-search.test.ts tests/dashboard-work.test.ts`
  - `npx tsx --test tests/configuration.test.ts tests/domain.test.ts tests/reports.test.ts tests/report-purpose.test.ts tests/report-preview.test.ts tests/report-artifacts.test.ts tests/result-remarks.test.ts`
- Browser: `node tmp/review-operations.mjs` passed; 26 screenshots across 1440x1000 and 390x844, no page-level horizontal overflow and no pageerror events.
- Interaction coverage includes Ctrl+K search, mobile touch search/theme, Escape dismissal, date/category controls, persisted theme, browser back, and reduced-motion style assertion.
- State checks: `node tmp/review-operations-states.mjs` passed 15 capture/interaction steps, with no pageerror events. Network errors and role variants were browser mocks. Report fixture writes are intercepted inside the browser; no live record save occurred.
- Screenshot evidence: tmp/redesign-review/*.png. Main captures include overview-desktop, overview-populated, overview-dark, overview-mobile, login-desktop, login-mobile, navigation-mobile, assistant-mobile, worksheet-mobile, report-editor-mobile, and receipts-error.
- Machine results: tmp/redesign-review/verification.json and states.json.
- Final state walkthrough recording: tmp/redesign-review/recordings/page@8e9cb1ad2851ea937084942f9733044b.webm.
- No untouched before screenshot was captured. The comparison baseline is the existing source and early iteration captures, not a claimed pixel comparison against a pristine original.

## Video login follow-up, 24 October 2026

- Replaced the login composition with an original eight-second MP4 workflow film, a poster fallback, a responsive paper-colored authentication panel, and pause/play controls. No supplied reference media is embedded.
- Added a tab-scoped ten-minute visual-intent timestamp across the existing Google redirect. The authenticated local entry shares the reveal. Authentication, cookies, roles and server OAuth handling are unchanged.
- The reveal waits for authenticated `/me` and configuration, keeps covered content inert, offers Skip animation, and transfers keyboard focus after dismissal. Reduced motion uses the poster and immediate entry. Browser storage failure skips the optional reveal.
- `node tmp/review-login-film.mjs` passed 11 focused browser checks with no pageerror events. Edge desktop 1440x900 and mobile 390x844: video advancement, pointer pause, keyboard resume, mobile entry, cross-document redirect simulation, consumed/expired intent, keyboard focus, skip, reduced motion, missing media, blocked storage, API/settings errors, and a stalled session request.
- Final `npm run build -- --configLoader native` passed TypeScript and production bundling (4,636 modules). Existing large drawing/diagram chunk warnings remain. The in-app preview also confirmed entry, focus transfer, and login rendering after switching the saved dashboard theme to dark; the prior light preference was restored.
- Evidence: `tmp/redesign-review/login-film/checks.json`, `login-desktop.png`, `login-google-desktop.png`, `login-google-mobile.png`, `workspace-reveal.png`, `dashboard-after-mobile-entry.png`, and `login-to-dashboard.webm`. A seven-second excerpt is `login-preview.mp4`.
- Independent Impeccable source/render review found a pause-button stacking conflict, missing connecting playback controls, and clickable content behind the reveal. All were fixed; the follow-up review found no remaining significant issue in the reviewed source/screenshots. The Impeccable detector was unavailable; no detector pass is claimed.
- Live Google account authorization was not performed. The redirect test uses browser-only interception and the existing demo session; it proves visual continuity and state handling, not provider configuration. Safari and physical mobile devices remain unchecked.

## Independent design and technical review

Used the Impeccable critique/craft guidance with two independent source/render reviews. The Impeccable engine was unavailable, so there is no automated detector pass. Live Playwright verification was performed by the main session; independent reviewers assessed source and screenshots.

| Finding | Resolution and evidence |
|---|---|
| Mobile page widened to 704px | Explicit workspace and route width/min-width; every final page-width assertion passes |
| Search/theme disappeared on mobile | Utility actions restored inside drawer; actual touch interactions passed |
| Drawer close icon lacked contrast | Explicit light icon on dark button; navigation-mobile capture |
| Assistant text clipped in compact buttons | Header action auto width; send icon-only on mobile with accessible name; assistant-mobile capture |
| Failed refresh left stale receipt summary values | Hide failed overview data; distinguish loading, unavailable and confirmed zero; same-month failure assertion and retry passed |
| Unconditional operational status claim | Neutral Sample reception label; timezone visible |
| Dashboard touch controls too small | Month/category/mix controls at least 44px on mobile |
| Operational records too far below summaries on mobile | Compact chart sizing restored and mobile summary cards shortened |
| CSS reordering created a mobile focus-order mismatch | Removed visual reordering; source, reading and visual order agree |
| Dark summary text and active settings label lost contrast | Explicit foreground treatment; dark overview and settings captures |
| Login metadata/alignment inherited old layout | Reset in final entry-page rules; desktop/mobile captures |
| Worksheet refresh control clipped | Auto width and no-wrap rule; mobile capture |
| Stale navigation selection pill | Hidden until matching active item is measured; final active navigation captures |

## Graphical motion follow-up

Added a labelled, linked Receive / Review / Prepare SVG workflow guide, travelling trace and stage outlines, sample-mix segment reveals, chart update transitions, and visible Pause/Play/Replay controls. It remains visible in empty months without inventing sample activity. No dependencies or API mutations were added.

`node tmp/review-dashboard-motion.mjs` checks advancing SVG stroke offset, paused offset stability, replay, the seven-record September demo, desktop/mobile page width, system reduced motion including stage outlines, and a saved pause preference after reload. Evidence is under tmp/redesign-review/motion: checks.json, dashboard-motion-desktop.png, dashboard-motion-populated.png, dashboard-motion-mobile.png, and dashboard-motion.webm.

Independent source/render review found no significant regression. Removed ambiguous aria-pressed from the changing-label Play/Pause command after the review. No automated detector pass was available.

## Limits

This is a local demo verification, not a production release or an exhaustive security/accessibility certification. No real Google OAuth sign-in, Sheets/Drive write, assistant-provider call, production deployment, or approved production DOCX comparison was performed. Existing report regression tests passed; they do not replace an approved document acceptance comparison.

Shared resource editing, all settings subsections, every sample category form, offline service worker behavior, and every report-template variant were not exhaustively exercised. Desktop/mobile page widths and selected states passed; that does not prove every nested control or intermediate viewport is correct. Reference motion is adapted to laboratory operations, with reduced motion honored, rather than reproduced frame for frame.
## Remotion route-film follow-up

Added `src/WorkflowFilm.tsx` and the shared `useWorkspaceMotion()` preference in `src/motion.ts` so every workspace destination (`/`, `/new`, `/samples`, `/worksheet`, `/reports`, `/library`, `/shared`, `/assistant`, `/settings`) renders a distinct frame-driven Remotion scene above the working surface, with inner tab transitions and synchronized Pause/Play/Replay controls.

`node tmp/review-workspace-films.mjs` passed 13 checks: advancing SVG frames, pause freeze, replay, and 1440px/390px overflow assertions across all nine routes, plus intake draft preservation across Replay/Pause, shared motion preference persistence across client navigation, `prefers-reduced-motion: reduce` still-frame handling, and interactive nested tabs in Shared tools and Settings. Evidence is saved under `tmp/redesign-review/workspace-films/` (`checks.json`, desktop/mobile captures, and `workspace-films-preview.mp4`).

## Login Remotion redesign, October 24, 2026

Replaced the floating text-card film with a large, caption-free culture-plate composition. Rebuilt the login with an obsidian artwork field, an unboxed paper sign-in surface, and responsive mobile layout. Removed release/compliance claims and decorative stage cards. Replaced the CSS bar wipe with a frame-driven 1.2-second Remotion aperture reveal. Google authentication, configuration gating, expiring intent, errors/retry, inert coverage, skip, and focus transfer remain intact.

`npm run lint` passed. `node tmp/review-login-film.mjs` passed 11 grouped checks with no browser page errors: advancing login and arrival SVGs, pointer pause/keyboard resume, entry/skip/focus/inert behavior, a simulated cross-document OAuth redirect, API/configuration failure recovery, stalled session recovery, expired intent, fixed-frame reduced motion, blocked storage, and 320/390/768/1440px layout checks. Screenshots and the complete interaction recording were refreshed under `tmp/redesign-review/login-film/`.

Manual Impeccable source/render audit: the legacy playback-control positioning rule caused the button to overlap the plate; scoped selectors fixed it, and geometry assertions now prevent recurrence. Final desktop/mobile captures show clear hierarchy, controls outside artwork, no nested sign-in cards, and no horizontal overflow. Controls have visible focus and at least 44px height. Motion uses frame-driven geometry without CSS animation inside compositions, pauses when the document is hidden, and honors system reduced motion. No significant issue remains in the reviewed login surface. The Impeccable detector remains unavailable; no automated detector pass or exhaustive accessibility certification is claimed.

Not checked in this follow-up: live Google account authorization, Safari, physical mobile devices, production bundling, or a deliberately crashed Remotion player. Browser OAuth interception verifies the interface handoff, not provider configuration.
