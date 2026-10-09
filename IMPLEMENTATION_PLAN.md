# Shared Excalidraw and Kanban Sticky Notes — Implementation Plan

Status: Proposed; implementation has not started.

## Objective

Add two collaborative tools to IPI:

- An Excalidraw whiteboard for shared interactive drawings.
- A Kanban notepad containing sticky notes arranged into columns.

Both tools must be viewable by authorized workspace users, editable by all non-viewer users, and saved to Google Drive. Viewers have read-only access. Obsidian integration is outside this scope.

## Planning assumptions and discovery constraints

The repository could not be inspected during planning because the terminal failed to start. Framework, authentication, backend, database, deployment, and existing Drive integration are unverified. This plan deliberately leaves file-level changes and infrastructure selection to discovery.

Proposed defaults:

- Boards and drawings belong to the existing IPI workspace or project, inheriting its membership.
- All non-viewers can create, edit, move, and delete shared content, regardless of who created it.
- Existing IPI rules govern membership and access administration.
- Sharing an IPI URL does not grant access by itself.
- Live collaboration uses durable backend state; Google Drive holds recoverable saved files and previews. Whether backend persistence in addition to Drive is acceptable must be resolved before implementation.

## Phase 1 — Inspect and finalize architecture

- [ ] Read applicable repository instructions and inspect the existing implementation.
- [ ] Identify reusable navigation, dialogs, menus, editors, role checks, and save-status components.
- [ ] Review authentication, workspace membership, session handling, and server-side authorization.
- [ ] Inspect existing Drive OAuth scopes, file ownership, folder structure, and token handling without exposing credentials.
- [ ] Identify the current database and whether deployment supports long-lived collaboration connections.
- [ ] Choose a collaboration transport and conflict-resolution strategy compatible with the existing stack. Assess Excalidraw's own scene reconciliation before selecting its adapter; do not assume a generic text collaboration library handles drawing elements.
- [ ] Resolve Drive ownership: workspace-connected account or organization shared drive. Collaborators must not each create separate copies of the same resource.
- [ ] Define the authority of IPI membership versus Drive permissions, including revocation and access inherited from folders.
- [ ] Record architecture decisions and concrete files to change after inspection.

Exit criterion: a reviewed architecture maps each requirement to existing services or explicitly required infrastructure, including hosting and operational implications.

## Phase 2 — Common resource model and permissions

Implement reusable resource metadata for boards and drawings: stable ID, workspace ID, type, title, creator, timestamps, revision, Drive file ID, and deletion state.

| Capability | Viewer | Non-viewer |
| --- | --- | --- |
| List and open accessible resources | Yes | Yes |
| Receive live changes and presence | Yes | Yes |
| Create or rename boards/drawings | No | Yes |
| Create, edit, move, or delete content | No | Yes |
| Delete boards/drawings | No | Yes |
| Manage membership and sharing | Existing IPI rules | Existing IPI rules |

- [ ] Enforce membership and role checks on reads, writes, exports, and room admission.
- [ ] Reject viewer mutations at the server, including direct API and collaboration messages.
- [ ] Revalidate active sessions when membership or roles change.
- [ ] Add resource creation, listing, renaming, and recoverable deletion.
- [ ] Define recovery/retention behavior for deleted resources and their Drive files.

Exit criterion: unauthorized requests fail even when UI restrictions are bypassed.

## Phase 3 — Shared collaboration and Drive persistence

Use one collaboration room per resource. Persist accepted changes durably and checkpoint complete snapshots to Drive through a single coordinated writer per resource. Multiple server instances must share coordination rather than maintain independent save queues.

- [ ] Implement authenticated room joins, initial state loading, live updates, and presence.
- [ ] Define revision/order semantics, conflict resolution, duplicate-message handling, and reconnect replay.
- [ ] Keep presence, cursor position, selection, and viewport separate from saved shared content.
- [ ] Preserve pending edits across temporary connection failures and reconcile before replay.
- [ ] Define simultaneous edit/delete behavior so stale updates cannot resurrect deleted content.
- [ ] Coordinate Drive writes using resource revisions and a durable retry queue.
- [ ] Save to Drive after a short quiet interval with a maximum checkpoint interval during continuous editing; finalize timing after load testing.
- [ ] Persist schema-versioned snapshots and all referenced assets required for recovery.
- [ ] Reconcile externally changed, moved, deleted, or inaccessible Drive files without silently overwriting unexpected changes.
- [ ] Display connection status and distinguish pending changes, durable IPI saves, Drive saves, and Drive failures.
- [ ] Make save failures retryable; do not claim a Drive save before successful completion.
- [ ] Provide a restore path from a Drive snapshot into a fresh collaboration session.

Suggested saved formats:

- Kanban: one versioned JSON document per board.
- Excalidraw: a compatible `.excalidraw` scene plus image assets, or an explicitly tested self-contained scene format.
- Previews: Excalidraw PNG/SVG and a readable Kanban export for viewing outside IPI.

Exit criterion: resources survive refresh and backend restart; failed Drive checkpoints resume without losing accepted edits.

## Phase 4 — Kanban sticky-note notepad

Initial columns: To do, In progress, Done. Columns are customizable by non-viewers.

Minimum data model:

- Column: stable ID, title, ordered position.
- Note: stable ID, column ID, ordered position, title, body, color, creator, editor, timestamps, revision/deletion metadata.

- [ ] Add shared board navigation using existing IPI components.
- [ ] Implement note creation, inline title/body editing, color selection, and deletion with undo.
- [ ] Support simultaneous note-body editing using the chosen conflict-resolution strategy.
- [ ] Implement drag-and-drop within and between columns, plus keyboard and menu-based movement.
- [ ] Make concurrent reorders deterministic and retain stable note IDs.
- [ ] Implement column creation, renaming, reordering, and deletion.
- [ ] For populated-column deletion, offer moving notes to another column or explicitly deleting its contents.
- [ ] Add empty, loading, permission-denied, disconnected, and failed-save states.
- [ ] Provide readable, touch-friendly mobile column navigation.
- [ ] Implement viewer mode and live updates without editable controls.

Design: compact sticky notes, restrained colors, clear column headings, deliberate spacing, minimal card nesting, readable text, visible keyboard focus, and subtle motion.

Exit criterion: two editors can edit and move notes together while a viewer observes; the same board reopens correctly from saved state.

## Phase 5 — Excalidraw integration

- [ ] Integrate and lazy-load the official Excalidraw editor, keeping its styles within the intended application surface.
- [ ] Implement drawing creation, naming, reopening, and recoverable deletion.
- [ ] Connect editor scene changes to the selected Excalidraw collaboration adapter.
- [ ] Synchronize elements, deletion metadata, and shared image assets.
- [ ] Show participant names and live collaborator cursors.
- [ ] Implement server-enforced viewer mode while allowing pan/zoom.
- [ ] Keep individual viewport and selection state local.
- [ ] Verify undo/redo semantics under collaboration so undo does not roll back unrelated changes from other users.
- [ ] Implement `.excalidraw` import/export and PNG/SVG export.
- [ ] Save previews and ensure images remain available after reopening or recovery.
- [ ] Add loading, connection, permission, and save-failure states consistent with Kanban.
- [ ] Verify resizing, touch controls, fullscreen behavior if supported, and navigation away from pending edits.

Exit criterion: multiple editors draw together, viewers see updates, and complete scenes including images survive reopening and restoration.

## Motion, vector graphics, and performance requirements

Treat motion and vector graphics as part of implementation and verification for both tools, not a final decoration pass.

- Reuse the existing icon system and use crisp SVG/vector assets for navigation, board actions, status indicators, and helpful empty-state illustrations. Match stroke weight and sizing; provide accessible labels for meaningful controls and hide decorative graphics from assistive technology.
- Preserve Excalidraw's native drawing renderer and vector exports. Verify export appearance, fonts, and embedded images; do not add a competing animation layer over the drawing canvas.
- Animate note insertion/removal, column reordering, drag lift/drop, menus, and save/connection status only where motion clarifies state. Use restrained easing and physically believable settling, with no unnecessary looping decoration.
- Define motion tokens using existing design guidance. Start with approximately 120–200 ms for small feedback and 180–280 ms for spatial transitions; tune against the rendered UI and installed skill requirements.
- Honor `prefers-reduced-motion`, removing nonessential spatial motion while retaining immediate, readable state feedback.
- Prefer transform/opacity animations. Avoid per-frame layout changes, broad animated shadows/blur, or global rerenders from pointer movement.
- Keep drag feedback immediate and prevent board-wide animation replay when remote updates arrive. Coalesce presence/cursor traffic and update the minimum affected content.
- Lazy-load the Excalidraw bundle. Separate urgent local interaction from network transmission, preview generation, and Drive checkpoint work.
- Use virtualization or equivalent rendering limits only when representative board sizes demonstrate a need; preserve keyboard navigation and accessible focus.
- Profile representative large boards/drawings on desktop and a mobile-class device or documented equivalent. Record dataset sizes, hardware/browser, frame behavior, long tasks, and memory behavior before claiming performance success.
- Target smooth dragging/panning at the device's refresh rate, using 60 fps as the baseline on capable devices. Investigate repeated missed frames or main-thread tasks over 50 ms during core interactions; do not treat a successful build as performance evidence.

Acceptance: icons and exports remain sharp at relevant sizes, reduced-motion settings work, local and remote actions have coherent feedback, and profiling shows responsive dragging, editing, and panning without sustained jank or unbounded resource growth.

## Phase 6 — Verification and design review

Follow the IPI Frontend Design Protocol. Apply installed Emil-inspired and Impeccable guidance; use Taste where a reference design is relevant. Inspect before changing, extend existing components where practical, and treat the rendered application as the source of truth.

- [ ] Run applicable compilation, lint, and meaningful tests required by the repository.
- [ ] Start the development server and inspect both features using Playwright.
- [ ] Test independent authenticated editor/editor/viewer sessions.
- [ ] Test desktop and mobile widths, keyboard operation, touch interaction, dialogs, overflow, long text, and empty boards.
- [ ] Test concurrent note edits, note reorders, drawing edits, and edit/delete races.
- [ ] Test forged viewer write requests, cross-workspace access, and role revocation during an active session.
- [ ] Test disconnect/reconnect, refresh with pending edits, backend restart, and duplicate-message replay.
- [ ] Test Drive token expiry, revoked access, failed writes, rate limits, retry recovery, and external file changes.
- [ ] Verify recovery from Drive alone and reopening Excalidraw image assets.
- [ ] Test multiple application instances if the deployment uses them.
- [ ] Verify vector/icon consistency, drawing exports, reduced motion, and local/remote transition behavior.
- [ ] Profile drag, reorder, editing, canvas pan/zoom, and concurrent updates with representative data; record evidence and fix significant bottlenecks.
- [ ] Run an Impeccable critique/audit, capture useful screenshots, and fix significant findings.

Release acceptance:

1. Authorized users can discover and open shared boards and drawings.
2. Every non-viewer can create, edit, move, and delete shared content.
3. Viewers receive updates but cannot modify content through any supported write path.
4. Concurrent changes converge consistently without silent loss or deleted-content resurrection.
5. Saved Drive content can restore a usable board or complete drawing.
6. Save and connection indicators accurately reflect persistence and failures.
7. Both tools work at desktop/mobile widths and support keyboard navigation.
8. Vector graphics and motion meet the requirements above, with recorded performance checks and working reduced-motion behavior.

## Delivery order

1. Repository discovery and architecture decisions.
2. Common resource permissions, collaboration, and Drive persistence.
3. Kanban sticky-note board.
4. Excalidraw and its collaboration adapter.
5. Combined reliability tests, rendered UI verification, and design refinements.

Each feature should remain behind the project's existing feature-gating mechanism, if available, until its acceptance checks pass.

## Deferred scope

Obsidian, public anonymous editing, comments, task assignments, notifications, advanced automation, and bidirectional editing through external applications are outside the initial release. Links between sticky notes and drawings can follow once both tools are reliable.

## Technical references

- Excalidraw integration: https://docs.excalidraw.com/docs
- Excalidraw collaboration requirements: https://docs.excalidraw.com/docs/@excalidraw/excalidraw/faq
- Google Drive sharing and permissions: https://developers.google.com/workspace/drive/api/guides/manage-sharing
- Google Drive OAuth scopes: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
