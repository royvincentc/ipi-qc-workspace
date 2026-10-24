# IPI Microbiology design system

This direction replaces the earlier lime-and-graphite workbench. The supplied 311796.mp4 is the composition and motion reference, not an application asset. Operate mode: receipt intake, source review, worksheets, and report preparation.

## Composition

A compact horizontal destination bar with a moving dark active pill. A narrow charcoal utility rail holds search, intake, theme, shared tools, sync, and administrator settings. Mobile uses a labelled navigation drawer with focus containment and Escape dismissal.

The overview is a two-column receipts timeline and sample mix, a four-part summary strip, then a filterable grouped logbook. Monthly totals always describe all dated receipts in the selected month; filtering changes table matches without relabelling those totals. Daily bars retain the existing rolling 31-day context. No due dates, progress percentages, or release decisions are inferred.

Other routes share the same light surfaces, compact control hierarchy, local table scrolling, readable form groups, and subdued secondary panels. Existing scientific logic, report templates, revisions, permissions, and integrations remain authoritative.

## Tokens

Source: src/operations.css; route composition: src/operations-routes.css. Both load after the legacy sheets while older features still rely on their selectors.

| Token | Light | Dark |
|---|---|---|
| Application | #f0f3ee | #171b18 |
| Surface | #fdfefb | #202621 |
| Elevated surface | #e8ede7 | #2b332d |
| Primary text | #18221f | #eef3eb |
| Secondary text | #59665f | #bcc8be |
| Accent | #1d4d3f | #b7d8bb |
| Blue context | #dceaf7 | #293d4d |

Typography: locally served Assistant, reusing existing font files. Headings 26-34px, display login heading 40-68px, normal controls and records 13-16px. Panels 18px corners; fields 9px; active navigation fully rounded. Borders provide grouping without stacked inset cards. Charts use flat category colors, not glow or 3D styling.

## Motion and accessibility

Use the existing selection measurement for the navigation pill (220ms), route entrance (650ms), brief group staggering, inner tab/panel entrance (480ms), chart entrance, and existing modal/drawer mechanics. Theme surfaces transition over 180ms. Result numbers never count through interim values. Reduced motion disables spatial animations and transitions. Preserve chart keyboard controls, semantic tables, explicit field labels, native dialogs, skip link, visible focus, dirty-navigation protection, and role checks.

Every primary route renders a caption-free, 86px-high laboratory film with a responsive composition width (`src/WorkflowFilm.tsx`) powered by Remotion `useCurrentFrame` inside `@remotion/player`. Each destination has its own motif set and movement: reception specimens/cultures/microscopy; intake pipetting and label scanning; sample racks and logbooks; worksheet assay wells and incubation; report plots and document preparation; library books and methods; shared boards and branching connections; assistant searches and citations; settings sliders, access keys, and instrument calibration. Reuse individual laboratory forms where relevant, never the complete sequence across routes. Flat linework uses the supplied obsidian, pink, and yellow palette. Drawings remain approximately 60px tall on desktop and mobile; no chapter copy, stage captions, or cards occupy the artwork. The sequence is illustrative rather than live laboratory state. Switching nested tabs restarts the scene with a fresh variation while keeping working forms and tables intact. All films share the `ipi.reception.motion` preference (`src/motion.ts`), autoplay by default, pause when scrolled offscreen or in a hidden tab, and rest on frame 45 under `prefers-reduced-motion: reduce`.

The dashboard includes an illustrative Receive / Review / Prepare diagram: a 5.4-second trace travels between linked workflow stages with timed outline responses. This is explicitly labelled as a guide, not live sample status. Sample-mix segments reveal over 700ms; existing chart bars enter and use 240ms updates. Pause/Play uses the saved dashboard motion preference; Replay remounts the diagram, mix and chart without fetching or changing records. Explicit saved preferences override the constrained-device default. System reduced motion takes priority; background-tab CSS motion pauses and chart animation is disabled while hidden.

No reference PNG, video frame, fabricated business metric, compliance certification, or sample-release claim belongs in the interface. Login describes intake, review, and document preparation truthfully.

## Video login and workspace handoff

Login pairs an obsidian laboratory study with an unboxed, paper-colored authentication panel. Locally served Assistant typography, ample whitespace, and one primary action replace the old nested cards and stage badges. Mobile stacks a compact editorial/artwork field above the sign-in surface. A large, caption-free culture plate uses flat pink colonies and yellow streak linework; it is illustrative, contains no reference footage or specimen data, and makes no compliance or release claims.

Both login artwork and the 1.2-second workspace reveal are frame-driven Remotion compositions in src/LoginFilm.tsx, using the existing installed player. The artwork loops over eight seconds, has a labelled pause/play button, pauses in hidden tabs, and rests on a fixed frame under system reduced motion. Workspace, route, search, assistant, report setup, collaboration, reception, and sync loading indicators reuse the culture study at full or compact size, without pause controls. Loaders autoplay independently of the saved login-artwork pause setting, pause in hidden tabs, and keep the still frame under system reduced motion. Successful entry briefly carries the culture study forward, then opens a circular aperture onto the ready dashboard. Skip remains available. Covered workspace content stays inert until the reveal completes or is skipped; a fallback releases it if playback fails. The reveal waits for both the authenticated session and workspace configuration; reduced motion enters immediately, including when enabled during playback. Focus moves into the workspace if the user has not already focused another control.

A tab-scoped, ten-minute sessionStorage timestamp remembers an ordinary Google sign-in click across the OAuth redirect. It is consumed when the workspace mounts and never grants access or changes server authentication. Modified clicks do not set it. The already authenticated local preview entry uses the same handoff. With blocked browser storage, sign-in still works and skips the decorative reveal.

## Verification

See docs/REDESIGN-VERIFICATION.md and tmp/redesign-review/verification.json for route coverage, commands, evidence, and limitations.
