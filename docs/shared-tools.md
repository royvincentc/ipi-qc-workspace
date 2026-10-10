# Shared Kanban and Excalidraw

Open **Shared tools** from the application navigation. Create a Kanban board or drawing, or import a saved export. All active signed-in IPI users share this single workspace. Administrators and analysts can create, edit, reorder and delete resources and their contents; viewers can read, pan, zoom and export. This implementation does not introduce project-specific membership or public anonymous sharing.

## Collaboration and recovery

Editing is local first. A browser IndexedDB database stores the last acknowledged snapshot and durable pending operations, scoped to the signed-in user. Notes, titles, colors, columns and moves update immediately without waiting for the network. Consecutive text and movement changes are combined before upload. Queued changes survive navigation, reloads and browser restarts; storage failures remain visible and protected by the navigation guard.

Automatic sharing runs every four hours while the workspace is open and connected. Its deadline survives reloads; an overdue batch is sent when the board is next opened online. **Save board** and **Save note** bypass the deadline and immediately save pending changes to IPI. **Save to Drive** first saves pending changes to IPI, then creates a Drive checkpoint. Scheduled sharing also requests a Drive checkpoint when a folder is connected. Edits and drags do not request Drive uploads. Collaborators receive locally staged edits only after a scheduled or manual sync.

The server database remains authoritative for shared revisions. Batches apply atomically under PostgreSQL transaction locks, deduplicate operation IDs and write the resource once per batch. A conflicting batch rolls back and identifies the rejected operation. Yjs text updates still merge concurrent edits. SSE announces changes immediately on the same server; a small metadata/access check every 15 seconds detects changes from another instance and revoked sessions. Presence checks do not read the full board, and opening an unchanged cached revision returns an empty 304 response.

Production builds cache the application shell and last authenticated bootstrap settings so previously visited boards can reopen offline. Board content and pending changes remain in IndexedDB, rather than the service-worker API cache. Reconnecting before the deadline does not upload local edits. Offline access requires a previous online sign-in and visit; creating a new shared resource and first-time access still require a connection. Automatic timers cannot run in a closed browser; overdue changes sync on the next online opening. Sign-out and authentication rejection clear the offline bootstrap cache.

Note bodies use Yjs text updates. Title/color conflicts require an explicit choice. Drawing changes use Excalidraw element versions, deterministic reconciliation and deletion tombstones; viewport and selection remain personal. Resource deletion is reversible through Recently deleted. A note's Undo deletion creates a new note ID. Export/import restores a new resource without requiring the original database.

## Google Drive setup

The requested destination is [the shared Drive folder](https://drive.google.com/drive/u/0/folders/0AJ1DArdKmngAUk9PVA), ID `0AJ1DArdKmngAUk9PVA`. This records the user's selection; access and live checkpoint writes are not yet verified. Configure backend credentials and grant the service account edit access before connecting it through the administrator UI.

1. Configure the application's existing Google service-account credentials on the backend.
2. Create a dedicated shared-tools Drive folder and grant that service account edit access. Grant the intended human users access through Google Drive separately.
3. As an IPI administrator, open **Shared tools → Drive connection** and enter the folder ID or URL.
4. Open a resource and inspect its save status. The background worker checkpoints canonical JSON, readable Kanban HTML, and drawing PNG previews. A drawing's JSON includes its image assets.

Drive stores checkpoints; live multiplayer editing occurs inside IPI. The integration never broadens Google Drive sharing permissions. Anyone viewing a preview in Drive needs Drive access; editing in IPI needs an active IPI account. Demo mode deliberately disables Drive writes. Existing files are checked for identity, parent folder and external changes before overwrite. Failed checkpoints stay queued and retry; the UI displays the failure. Recovery imports canonical `.excalidraw` or Kanban JSON files from Drive, rather than interpreting a preview as editable content.

## Visual behavior and performance

The extension reuses IPI typography, icons, dialogs, fields and paper/lime/graphite surfaces. Sticky-note color identifies note content; dark ink remains readable in both themes. Motion is limited to detail-panel reveal, existing controls and drag/reorder feedback, with reduced-motion and application motion settings respected. No continuous decorative animation was added. Large columns window offscreen notes; an explicit Move up/down menu keeps ordering accessible when a distant note is not mounted. Excalidraw loads only on drawing routes, uses local fonts, batches element writes and waits until interaction is idle before generating previews.

Chrome 154 profiling used invented fixtures with 240 notes and 800 simple vectors at 1440×1000 and 390×844. The mobile run used 4× CPU throttling, not physical hardware. After optimization, board frame p95 improved from roughly 461 ms to 28 ms on desktop and 18 ms on mobile; isolated desktop drag long tasks remained. Drawing desktop p95 was approximately 18 ms. The 800-vector overview remains expensive under throttling (p95 approximately 107 ms, isolated pauses up to 519 ms). This stress case does not satisfy a universal 60 fps claim; physical-device validation and further upstream canvas profiling remain release work. Heap samples varied around 53–83 MB and are not a memory-leak test.

## Verification evidence

- `npm test`: an earlier complete run passed all 139 tests. The final run passed 138/139, with a Windows `EPERM` rename failure in the existing report-artifact recovery test. Its focused retry passed all three artifact tests. All collaboration tests passed, including convergence, stale-write conflicts, viewer mutation rejection, durable idempotency, import/restore, image persistence and preview revision checks. The original failure is retained in `tmp/shared-tools-tests.log`; retry evidence is `tmp/shared-tools-artifact-retry.log`.
- `npm run build`: production build passed; Excalidraw's lazy chunks retain the upstream size warning.
- Playwright: separate editor contexts, concurrent text/drawing updates, drawing undo/redo preserving the other editor's element, PNG/SVG export, note delete/undo, temporary network-failure replay, reload persistence, reduced motion, desktop/mobile overflow and dark-theme checks. Viewer UI was verified with a mocked session and disabled event stream; server mutation rejection was verified independently through actual handlers.
- Evidence: `output/playwright/shared-final-results.log`, `shared-performance-results.log`, `shared-tools-audit.md`, and `.impeccable/review/shared-*.png`.

Additional recovery checks pass: real hashed session cookies authenticate two editors and a viewer against isolated account records; forged role headers cannot elevate viewer writes; missing, expired and disabled sessions fail. Active streams publish a downgraded role and close after account or session revocation. A fresh backend process reopens the isolated database, restores an image asset and deduplicates an acknowledged operation replay. Playwright emulated touch verifies card editing and drag lift; a simulated HTTP 503 save failure retains pending text across reload and retries successfully, and pending navigation displays a confirmation. The focused collaboration suite passes 9/9; TypeScript compilation passes. Evidence: `tmp/shared-remaining-tests.log`, `tests/collaboration-session.test.ts`, `tests/collaboration-restart.test.ts`, and `output/playwright/shared-remaining-results.log`.

Still unverified: live Drive upload and failure/retry cases, Drive-only restore against a real folder, multi-instance PostgreSQL deployment, physical touch hardware and extended offline soak testing. Undo isolation was checked for separate newly-created shapes; simultaneous changes to the same shape need broader testing. Browser demo sessions are administrators; the real-cookie editor/editor/viewer test exercises HTTP and SSE handlers against an isolated database, without live Google sign-in. The 800-vector mobile stress limit remains open.

## Annotation follow-up

Edit note text directly on the sticky card; focusing the text also opens its sidebar. The sidebar contains title, color and column controls and stays synchronized with card text through the shared Yjs hook. Drag the full header, or use Space and arrow keys. Feedback includes a lifted preview, bounded drop/settling motion and a local save acknowledgement; reduced-motion and application motion settings are respected.

Use **Save note** to flush text and apply title/color without waiting for an earlier text acknowledgement. Use **Save board** to flush open editors and immediately retry pending writes; success means the backend acknowledged the queue and peers can receive the revision. Text continues to save automatically. Color controls include eight presets, a native picker and a validated `#RRGGBB` field. Custom colors survive export/import and choose contrasting ink. Genuine unsaved edits still trigger navigation protection.

Shared mutations and Drive coordination use transaction-scoped advisory locks inside database transactions. A new collaboration lock namespace avoids the earlier session-lock namespace after the production deadlock report. Canvas geometry refreshes on scroll, resize and pointer-down; drawing commits wait for an active gesture to finish, and unchanged echoes avoid reconciliation. See output/playwright/shared-save-pointer-audit.md for the measured limits and verification evidence.

Use Fullscreen above a drawing for a canvas-only window view. Exit fullscreen or Escape returns to the normal workspace and restores focus. Background controls are inert while fullscreen. This is a window-filling canvas view, so browser chrome stays under the browser's control. Annotation verification and stress limits are recorded in output/playwright/shared-annotations-audit.md.

The subsequent 390×844 emulated-touch check also draws a rectangle in fullscreen using touch events, exits via the touch control and verifies the drawing persists after reload. This supplements the earlier desktop/mobile viewport and keyboard checks.

Empty board controls, a 9,501-character note with long unbroken text and multiple lines, sidebar access and missing-resource errors pass at 1440px and 390px without page errors or horizontal document overflow. Evidence: `output/playwright/shared-content-results.log`.
