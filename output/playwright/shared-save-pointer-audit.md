# Shared tools save, color and pointer follow-up

2026-10-10 · Impeccable technical audit and Emil interaction review · scoped refinement

Production Render application logs recorded `deadlock detected 500` at 2026-10-10 05:05:31 and 05:05:33 Asia/Taipei. Collaboration used session advisory locks before opening its write transaction. These locks are unsafe through the deployment's transaction pooler. Shared mutations now acquire transaction-scoped locks inside BEGIN, with a fresh collaboration namespace; successful operations publish their revision after COMMIT. The Drive coordinator uses a transaction-scoped try-lock as well. No existing session locks were broadly cleared.

| Before | After | Why |
| --- | --- | --- |
| Text acknowledgement disabled metadata saving | Save note flushes text and submits title/color independently | A text save failure must not prevent saving the chosen color. |
| Saved baseline lived in a ref | Saved baseline lives in React state | Navigation guards update immediately after acknowledgement. |
| Four named colors | Eight presets and validated six-digit hex/picker controls | User-selected colors persist and survive export/import. |
| No explicit board save | Save board flushes mounted editors, retries queued operations and awaits acknowledgement | Users can send pending changes immediately and receive accurate success/failure feedback. |
| Canvas offsets could become stale after layout or scroll | Resize/scroll refresh plus synchronous pointer-down refresh | Both the start point and endpoint stay aligned with the pointer. |
| Drawing commits and echo reconciliation ran during strokes | Commit after the active gesture; skip unchanged echoes; stable editor props | Avoid avoidable rendering/network work during movement. |
| Application control effects reached canvas toolbar | Canvas toolbar opts out of those effects | The editor owns its control geometry. |

## Evidence

- Focused automated suite: **12/12 pass**, including cookie roles/revocation, concurrent edits, transaction commit/rollback, hex validation and export/import, image restart recovery and operation deduplication.
- Production build and TypeScript compilation pass; Excalidraw lazy chunk size warning remains.
- Playwright Chrome: two independent demo browser contexts. Simulated 503 save failure, hex selection while text is pending, Save board retry, peer DOM update, and navigation without a stale confirmation pass.
- Invalid hex input disables Save note and blocks Save board with an actionable message. Color input/presets have labels, selected state and 44px targets. Black/white ink is selected for contrast against custom colors; status text remains fully opaque.
- Desktop 1440×1000 and mobile 390×844: no horizontal document overflow; light/dark controls visually inspected.
- Normal and fullscreen line gestures: **0px** origin error and **0px** endpoint delta error; **0** operation requests during active strokes.
- With the build idle and stable editor props, the short desktop line sample recorded frame p95 about **17ms** normal and fullscreen. Individual maxima were about **83ms** and **34ms**. The earlier simultaneous-build sample (50/33ms p95) is confounded by build CPU load and cannot isolate the benefit of each change. This is not a universal 60fps claim or a physical-device test.
- Results: `shared-save-pointer-results.log`; screenshots: `shared-pointer-fixed-desktop.png`, `shared-hex-fixed-mobile.png`, `shared-hex-fixed-mobile-dark.png`.

## Audit disposition

Accessibility 3/4, performance 3/4, theming 4/4, responsive behavior 3/4, maintainability 3/4: **16/20** within this change. No unresolved P0/P1 finding in the inspected flow. Existing large-vector mobile stress performance and physical-device coverage remain open.

Production verification requires the new backend deployment and an authenticated live session. The local direct PostgreSQL probe returned ECONNREFUSED; it did not mutate resource data. Render logs were read only. Live Drive failure/recovery and multi-instance PostgreSQL remain release checks in task.md.
