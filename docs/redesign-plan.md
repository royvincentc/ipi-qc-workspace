# UI/UX Redesign Implementation Plan

## Affected Files
- `src/styles.css` / `src/overhaul.css` -> Will be replaced or heavily refactored into a new `src/theme.css` for centralized design tokens and core component styles.
- `src/App.tsx` -> Redesign sidebar, topbar, command palette, and overall shell layout.
- `src/workspace.tsx` -> Re-implement the Dashboard with the new hero, compact metrics, tabbed active samples table, intelligence rail (right sidebar), and recent activity log.
- `src/ui.tsx` -> Update core UI components (buttons, badges, modals, drawers, toasts, loaders, skeletons) to match the new token system and motion guidelines.
- `src/pages.tsx` -> Update sample detail to optionally open in a drawer.
- `index.html` -> Add the Geist/Inter font families if needed, or rely on system fonts. Ensure dark mode is default.

## Dependencies
- Add a lightweight state management/utility for motion if needed, but the prompt strongly prefers CSS transitions and native animations. We will use CSS variables and `@keyframes` heavily.
- `lucide-react` is already present. We will use it exclusively for thin, technical icons.

## Design System Tokens
- **Colors**: Based around `#081117` background, `#101B23` surfaces, `#2DD4BF` accent.
- **Typography**: System-ui, Inter, SF Pro. Tabular nums for counts. Monospace for IDs.
- **Motion**: CSS transitions for hover (100ms), tabs (200ms), drawers (300ms spring).
- **Radii**: 6px controls, 10px panels.

## Phase Strategy
1. **Phase 3 (Tokens & Primitives)**: Create `src/theme.css` with the new dark-mode only design tokens. Update `src/ui.tsx` to use these classes. Remove old light-mode styles.
2. **Phase 4 (App Shell)**: Update `src/App.tsx` for the new collapsed/expanded sidebar, sticky topbar with command palette trigger, and right rail placeholder.
3. **Phase 5 (Dashboard Content)**: Update `src/workspace.tsx`. Implement the new compact metrics strip, the tabbed data table for Active Samples, and the right-side operational rail (schedule, calendar, quick actions).
4. **Phase 6 (Motion & Interaction)**: Add CSS spring animations, ASCII loaders, drawer transitions, and the command palette logic.
5. **Phase 7 (Verification)**: Test all core flows with the dev server to ensure business logic remains untouched.

## Risks & Mitigations
- **Risk**: Breaking existing routing or form logic. **Mitigation**: Do not change any `<form>` submission handlers, state hooks for data (`useConfiguration`, `api`), or `react-router` paths. Only change layout and CSS classes.
- **Risk**: Performance drops from animations. **Mitigation**: Use `transform` and `opacity` only. Support `prefers-reduced-motion`.
- **Risk**: Mobile layout breakage. **Mitigation**: Ensure CSS grid/flex structures gracefully degrade to single columns with CSS media queries.
