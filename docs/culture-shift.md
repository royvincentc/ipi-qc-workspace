# Culture Shift

An optional turn-based roguelike in the report editor. It appears during DOCX generation and keeps an active run mounted after success, failure, retries, result edits, and entry/review switching. Navigating away or reloading ends the run. PDF preview dialogs do not include the game.

## Direction contract

THESIS: A fictional living culture is a small tactical world, not a report progress indicator. Users choose to play; report output and errors remain authoritative.

OWN-WORLD: Assistant typography inherits the application. A circular dotted plate uses rose agar (#eed6e2), a paper surface (#fbf4f8), teal player (#256b64), red rivals (#a53654), and golden nutrients. Subsequent plates rotate through blue, honey, and violet media. The game retains its readable light medium inside either application theme.

STORY: Collect three nutrients, reach the transfer gate, choose a mutation, and survive another seeded plate. Moving or pulsing advances one turn; rivals act every second turn. Death ends the run. Every fifth plate has a resistant strain.

FIRST VIEWPORT: An invitation opens into a large plate on the left and vitality, stats, messages, and controls on the right. Mobile places movement and pulse controls directly below the plate, followed by vitality and turn feedback. Completion adds a View report action without moving focus out of gameplay.

FORM: An extension of the existing report surface. Native React state and SVG geometry provide the game; no engine, animation timeline, audio, external assets, or new packages are needed.

FINISH: Verify desktop and mobile rendering, keyboard and button controls, report lifecycle, evolution, failure recovery, spatial descriptions, and model invariants. Record findings and limits here.

## Scope and implementation

- `shared/culture-shift.ts`: seeded plate generation and immutable turn rules.
- `src/culture-shift.tsx` and `src/culture-shift.css`: game view, controls, plate descriptions, and scoped palette.
- `src/reports.tsx`: stable editor-level mount and completion focus handling.
- `tests/culture-shift.test.ts`: generation, combat, boundaries, evolution, death, and invariants.

The game uses no laboratory records, storage, API writes, sample decisions, or report-generation logic. There is no saved progression or leaderboard. The run belongs to the currently open report editor.

## Verification

Focused unit tests and TypeScript checking pass. The browser harness at `tmp/culture-shift-browser.mjs` intercepts every API request using the existing invented report fixture; no actual report is generated or saved. Desktop (1440px) and mobile (390px) checks cover completion, keyboard focus, report navigation, minimization, edits, retries, errors, and an automated route through normal controls into the first mutation and plate two. Artifacts are in `output/playwright/culture-shift/`. Mobile coverage uses viewport and button checks, not physical-device testing.

Independent review identified a mismatch between the pulse guide and Manhattan-distance combat, and missing accessible entity positions. The guide now uses a matching diamond; the board exposes current coordinates through a readable positions disclosure and an accessible description. Impeccable's mechanical detector returned no findings. Production generation speed and long-term game balance are outside this change.

The final Impeccable review cleared the mobile control placement after a 390x844 viewport capture and geometric browser assertion confirmed the complete plate and movement/pulse controls fit together above the save dock. Partial report batches were checked at both widths: the run and report errors remain visible without claiming all reports are ready.
