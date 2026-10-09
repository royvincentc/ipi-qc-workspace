# Excalidraw and Kanban — Progress Tracker

**Overall status:** Implemented locally — collaboration tests pass, browser recovery and responsive checks pass; design review complete; production validation remains.

**Current phase:** Local recovery, touch, content and authenticated-session verification complete; production release checks remain recorded below.

**Current blocker:** Drive destination supplied: `0AJ1DArdKmngAUk9PVA`. Backend Google service-account credentials are absent; folder edit access and live saving remain unverified. Drive writes are intentionally disabled in demo mode.

**Next action:** Configure backend Google credentials, grant the service account edit access to the supplied folder, connect it through the administrator UI, and validate live checkpoints. Remaining performance and deployment checks are listed below.

This file is the implementation checklist. Update it as work proceeds so the open document reflects current progress. It is not an automatic background monitor.

Reference: [Implementation plan](IMPLEMENTATION_PLAN.md).

## Status conventions

- `[ ]` Pending or in progress; use an accompanying status note for active work.
- `[x]` Completed and verified.
- Record blockers and remaining verification explicitly; implementation alone does not mean a task is complete.

## Planning

- [x] Define shared Excalidraw and Kanban sticky-note scope.
- [x] Define viewer and non-viewer expectations.
- [x] Create the phased implementation plan.
- [x] Create this progress tracker.

## 1. Repository discovery and architecture

Status: Implemented locally; see unchecked verification and release items.

- [x] Read repository instructions and inspect the existing implementation.
- [x] Identify reusable UI components and navigation.
- [x] Inspect authentication, workspace membership, and role enforcement.
- [x] Inspect backend, database, and collaboration hosting support.
- [x] Inspect Google Drive integration and OAuth configuration.
- [ ] Resolve Drive file ownership and destination folder/shared drive.
- [x] Confirm backend persistence alongside Drive saving.
- [x] Define how IPI roles and Drive permissions interact.
- [x] Select collaboration transport and conflict-resolution strategies.
- [x] Record architecture decisions and concrete files to change.

## 2. Shared resources and permissions

Status: Implemented locally; see unchecked verification and release items.

- [x] Add stable resource metadata for boards and drawings.
- [x] Implement shared resource listing, creation, and renaming.
- [x] Implement recoverable resource deletion and retention behavior.
- [x] Enforce workspace access on reads, writes, exports, and room joins.
- [x] Reject all viewer mutations on the server.
- [x] Apply role and membership changes to active sessions.
- [x] Verify editor/editor/viewer permissions independently.

## 3. Collaboration and Google Drive persistence

Status: Implemented locally; see unchecked verification and release items.

- [x] Implement one authenticated collaboration room per resource.
- [x] Implement initial state loading, live updates, and presence.
- [x] Define revisions, ordering, deduplication, and conflict resolution.
- [x] Implement reconnection and pending-edit recovery.
- [x] Prevent stale edits from resurrecting deleted content.
- [x] Persist accepted changes durably.
- [x] Implement coordinated Drive snapshot writes and durable retries.
- [x] Save versioned board/drawing data and required image assets.
- [x] Handle externally modified, deleted, moved, or inaccessible Drive files.
- [x] Show accurate connection, pending, IPI-save, and Drive-save status.
- [x] Implement restoration from Drive snapshots.
- [x] Verify refresh, backend restart, and failed-save recovery locally (live Drive failures remain below).

## 4. Kanban sticky-note notepad

Status: Implemented locally; see unchecked verification and release items.

- [x] Add board navigation and initial columns.
- [x] Implement sticky-note creation and title/body editing.
- [x] Implement simultaneous note-body editing.
- [x] Add restrained note colors and editing metadata.
- [x] Implement note deletion with undo.
- [x] Implement drag-and-drop and deterministic ordering.
- [x] Add keyboard/menu movement between columns.
- [x] Implement column creation, renaming, and reordering.
- [x] Handle populated-column deletion explicitly.
- [x] Add loading, empty, denied, disconnected, and failed-save states.
- [x] Implement viewer mode with live updates.
- [x] Add mobile column navigation and touch-friendly controls.
- [x] Save board JSON to Drive and provide a readable export.
- [x] Verify concurrent editing, movement, deletion, and reopening.

## 5. Excalidraw whiteboard

Status: Implemented locally; see unchecked verification and release items.

- [x] Integrate and lazy-load the official editor.
- [x] Implement drawing creation, naming, reopening, and deletion.
- [x] Connect scene updates to the collaboration adapter.
- [x] Synchronize drawing elements and deletion metadata.
- [x] Synchronize and persist image assets.
- [x] Show live participant names and collaborator cursors.
- [x] Implement viewer mode with pan/zoom.
- [x] Keep viewport and selection state local.
- [x] Verify collaborative undo/redo for separate local/remote elements (same-element conflict cases remain open).
- [x] Implement `.excalidraw` import/export and PNG/SVG exports.
- [x] Save scene files, assets, and previews to Drive.
- [x] Add consistent connection, permissions, and save states.
- [x] Verify resizing, emulated mobile/touch controls, and pending edits on navigation.
- [x] Verify concurrent drawing and recovery including persisted images; same-element undo remains open above.

## Motion, vectors, and interaction performance

Status: Implemented and profiled; largest drawing stress case remains slow under simulated mobile CPU throttling.

- [x] Inspect and reuse the existing icon system and motion conventions.
- [x] Add consistent SVG/vector graphics for controls, status, and useful empty states.
- [x] Verify accessible icon labels and decorative asset handling.
- [x] Define restrained motion tokens and easing using installed design guidance.
- [x] Implement drag/reorder feedback and detail/menu transitions; insertion/deletion update directly to avoid replaying motion on remote updates.
- [x] Keep remote updates from replaying unrelated animations.
- [x] Implement and verify `prefers-reduced-motion` behavior.
- [x] Prefer transform/opacity animations and avoid pointer-driven global rerenders.
- [x] Coalesce cursor/presence updates and separate local feedback from persistence work.
- [x] Verify Excalidraw vector exports, fonts, and image appearance.
- [x] Profile representative large boards/drawings on desktop and simulated mobile CPU (physical hardware still pending).
- [x] Record datasets, device/browser, frame behavior, long tasks, and memory behavior.
- [ ] Fix significant animation/rendering bottlenecks and repeat affected checks.

## 6. Verification and design review

Status: Implemented locally; see unchecked verification and release items.

- [x] Run required compilation, lint, and meaningful tests.
- [x] Start the development server.
- [x] Inspect and interact with affected UI using Playwright.
- [ ] Test separate editor/editor/viewer sessions.
- [x] Test desktop and mobile widths, emulated touch, keyboard, and overflow (physical-device checks remain pending).
- [x] Test long content, empty resources, and error states.
- [x] Test concurrent edits, reorders, and edit/delete races through convergence tests and browser interactions (same-element drawing undo remains open).
- [x] Test forged viewer writes using real session cookies; missing/expired/disabled sessions are rejected. IPI has one shared workspace, so a cross-workspace boundary is not applicable.
- [x] Test role revocation during an active session, including SSE role changes and access-ended events.
- [x] Test disconnects, refresh, backend restart, and replay deduplication locally.
- [ ] Test Drive expiry, revoked access, rate limits, failed writes, and retry recovery.
- [ ] Test restoration from Drive alone.
- [ ] Test multiple backend instances if applicable.
- [x] Apply installed design guidance and run an Impeccable critique/audit.
- [x] Capture useful screenshots and fix significant findings.
- [ ] Confirm all release acceptance criteria in the implementation plan.

## Progress updates

| Date | Update | Evidence / remaining work |
| --- | --- | --- |
| 2026-10-10 | Implementation plan and progress tracker created. | No application changes; repository discovery remains pending. |
| 2026-10-10 | Added motion, vector, reduced-motion, and interaction performance requirements. | Requirements recorded; implementation and profiling remain pending. |
| 2026-10-10 | Repository access restored through an approved command path. | Confirmed React/Express, PostgreSQL/PGlite, administrator/analyst/viewer roles, and service-account Drive integration. |
| 2026-10-10 | Added shared resource APIs, role enforcement, live updates, text merging, Drive checkpoint queue, and initial Kanban/Excalidraw UI. | Build, concurrency tests, rendered verification, and live Drive validation are pending. |

## Updating this tracker

During implementation, update the current phase, next action, and blocker when they change. Check off tasks after their relevant verification passes, and append a short progress entry after each meaningful milestone. Record failed checks and unresolved findings before moving to the next phase.

Implementation checkboxes above indicate implemented behavior verified by code review, compilation, focused tests, or browser interaction as appropriate. End-to-end live Drive saving is **not yet verified**; production credential/folder failure cases and multi-instance deployment checks remain unchecked.

| 2026-10-10 | Local implementation and automated checks complete. | 139 tests pass; build passes. Separate editors converge; viewer API writes rejected; offline retry, delete/undo, reload, exports, reduced motion and both viewport overflow checks pass. |
| 2026-10-10 | Performance and technical audit recorded. | Board columns virtualized; desktop board p95 improved 461→28 ms. The 800-vector throttled-mobile stress case remains slow; live Drive, undo isolation, role revocation, physical touch and multi-instance checks remain open. |


| 2026-10-10 | Finish review and documentation complete. | Reviewer scored the canvas-fit correction resolved; incumbent design files preserved. Incorrect CSS aliases corrected; light/dark detail backgrounds and viewer UI checked. Collaborative undo preserves remote shape and redo restores local shape. |


| 2026-10-10 | Final build and verification recorded. | Build passes. Earlier full suite 139/139; final run 138/139 due existing report-artifact Windows EPERM rename, focused retry 3/3 passes. All collaboration tests pass. Remaining production checks stay unchecked. |


## Annotation follow-up

- [x] Share the existing Yjs note-body logic between card and sidebar editors.
- [x] Edit note text directly on the card while its sidebar stays open.
- [x] Drag notes from the full title/header region.
- [x] Add bounded drag lift, drop settling and local save feedback.
- [x] Add canvas-only fullscreen with exit button and Escape handling.
- [x] Restore focus and isolate background controls during fullscreen.
- [x] Verify desktop/mobile editing, sidebar synchronization, header drag and fullscreen exits.
- [x] Verify the annotation viewport, reduced motion, viewer mode and motion performance.
- [x] Finish the technical/design audit and update handoff documentation.


Follow-up evidence: output/playwright/shared-annotations-audit.md. Direct card/sidebar edits, header dragging, keyboard movement, viewer controls, reduced motion, fullscreen exit/focus and 985px layout pass. Focused collaboration tests: 7/7. Drag content caching improved desktop stress p95 from about 82ms to 20ms; occasional stress pauses remain documented.

## Remaining-task verification — 2026-10-10

- Drive destination recorded in docs/shared-tools.md: `0AJ1DArdKmngAUk9PVA`. Connection is pending backend credentials and service-account access; no cloud files were written.
- Focused collaboration suite: **9/9 pass**, including real cookie sessions for two editors and a viewer, forged-role rejection, expired/disabled account rejection, active stream role downgrade and revocation. These exercise real authentication queries in an isolated database; live Google login and separate authenticated browser sessions remain open.
- Backend process restart: a new process reopens the persisted database, recovers a drawing image, and replays the original operation without adding a revision or journal entry.
- Browser at 390×844 with emulated touch: note editing, header drag lift, pending navigation warning, HTTP 503 failed-save recovery across reload, canvas fullscreen touch drawing and drawing reload pass. No page errors; document width equals viewport width. Physical hardware is not covered.
- Evidence: tmp/shared-remaining-tests.log and output/playwright/shared-remaining-results.log. TypeScript compilation passes. Live Drive failures/restoration, multi-instance PostgreSQL, same-element undo and large mobile drawing performance remain release work.
- Empty-board controls, a 9,501-character note with an unbroken word and multiple lines, synchronized sidebar access, and missing-resource errors pass at 1440px and 390px. No page errors or horizontal document overflow. Evidence: output/playwright/shared-content-results.log.
