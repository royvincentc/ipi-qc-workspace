# Shared tools finish review

## disposition

**fix**. The ordinary extension preserves IPI's incumbent visual direction. One material canvas-fitting defect needs correction. This review covers the supplied screenshots, changed source, and recorded browser evidence; it does not certify a production Drive deployment.

## persistence

The board and drawing remain inside the existing laboratory shell. Paper surfaces, graphite navigation, lime selection, compact type, shared buttons, fields and dialogs retain the product's identity. The board's three flat lanes avoid nesting generic cards inside cards. The drawing gives the actual Excalidraw canvas the largest working surface. All four required captures were opened and are valid: desktop/mobile Kanban and desktop/mobile drawing. Each shows its named route with settled content, rather than a blank or loading frame.

## fidelity

There is no approved comp or quality-bar card; DESIGN.md and PRODUCT.md are the authority for this code-led extension. The captures follow the established palette, hierarchy and restrained boundaries. Mobile uses local lane scrolling and a Jump to column selector, with document width remaining 390 in the recorded check. Desktop board width remains 1440. The note editor source uses an inline detail panel, accessible field labels, explicit text-saving language and move controls. The source respects reduced motion and application motion-off settings for the added reveal; the recorded reduced-motion check returned animationName none. Detector advisories were reviewed as supplied; corrected font/radius/color declarations are visible in the current CSS. The detector was not rerun.

## ceiling

The implementation reaches the appropriate ambition for an extension of an operations workspace. It does not introduce a separate visual world or decorate laboratory data with fabricated metrics. This is a finish review, not an assurance that every collaborative or deployment behavior works. The recorded 139 tests and production build are supporting evidence. Recorded browser checks cover document overflow, concurrent editing, recovery after a temporary failure, delete/undo, exports, and a dark-theme canvas check. Dark-theme screenshots, viewer browser captures, physical touch hardware, live Drive upload/retry/restore, multiple server instances, active role revocation and collaborative undo isolation are not demonstrated by the four supplied captures. The 800-vector mobile stress run at 4x CPU throttling remains slow: frame p95 about 107 ms and maximum pause about 519 ms. That is a disclosed performance limit, not evidence for a universal 60 fps claim. Desktop board dragging also recorded isolated long tasks.

## material_fixes

**P2 — Fit drawing places content beneath canvas chrome on desktop.** In `.impeccable/review/shared-drawing-desktop.png`, the upper rectangle and ellipse extend under the floating tool strip, and the instructional hint crosses their outlines. This screenshot was taken after the recorded Fit drawing click. In `src/drawing.tsx`, the fit handler calls `scrollToContent(editor.getSceneElements(), { fitToContent: true, animate: false })` without reserving the area occupied by the canvas controls. A user asking to see the full drawing receives a view with part of that drawing obscured.

Exact fix: make Fit drawing fit the scene into the usable canvas area, reserving top toolbar/hint space and bottom controls, while retaining personal viewport state and immediate, non-animated fitting. Use the existing Excalidraw API or a bounded zoom/scroll adjustment; do not change shared element coordinates or hide working controls. Verify the same widely separated scene on desktop and mobile: all element bounds must remain visible clear of toolbar/hint overlays after fitting. Rebuild once and recapture all four required files, then return them for a verdict pass on this listed fix.

No P0 or P1 finding is established by the supplied evidence. The disclosed throttled stress performance is a follow-up limit; this review does not prescribe a new performance target unsupported by the brief.

## keep

Keep the flat lanes, note ink/color pairing, visible Add a note action, mobile column selector, inline note detail panel, existing shared controls, lazy drawing load, local fonts, idle preview generation, clear local-demo/Drive status, and explicit viewer read-only behavior. Preserve the paper/graphite/lime hierarchy and the bounded interaction motion. Do not replace these with extra containers or decorative motion while fixing fitting.
