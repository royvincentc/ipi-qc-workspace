---
name: IPI QC Microbiology Operations Dashboard
description: A traceable laboratory workbench in paper, graphite, sage, and soft lime.
colors:
  app-bg: "#1b1d19"
  surface: "#242621"
  surface-elevated: "#2b2d27"
  surface-hover: "#33362e"
  text-primary: "#f5f6ef"
  text-secondary: "#c6c9bd"
  text-tertiary: "#a8ae9d"
  accent: "#e4f7a7"
  accent-hover: "#eefbc7"
  accent-action: "#e4f7a7"
  accent-action-hover: "#d9ef96"
  accent-ink: "#20241b"
  rail: "#30332b"
  border: "rgba(228,234,216,.12)"
  border-subtle: "rgba(228,234,216,.09)"
  border-strong: "rgba(228,234,216,.24)"
  light-app-bg: "#f5f6f2"
  light-surface: "#fcfcf9"
  light-surface-elevated: "#eef1e9"
  light-surface-hover: "#e8eddf"
  light-text-primary: "#20241e"
  light-text-secondary: "#4e5648"
  light-text-tertiary: "#646e5a"
  light-accent: "#52652a"
  light-accent-hover: "#3d4e1e"
  light-accent-action-hover: "#d8ef98"
  light-border: "rgba(39,49,29,.12)"
  light-border-subtle: "rgba(39,49,29,.08)"
  light-border-strong: "rgba(39,49,29,.24)"
  success: "#34D399"
  warning: "#FBBF24"
  critical: "#F87171"
  info: "#60A5FA"
  light-success: "#087d55"
  light-warning: "#9a6600"
  light-critical: "#b42318"
  light-info: "#175cd3"
typography:
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(24px,2vw,28px)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-.035em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "13px"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  data:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
    fontSize: "13px"
rounded:
  field: "12px"
  control: "16px"
  rail-item: "20px"
  action-tile: "18px"
  workflow-panel: "22px"
  panel: "28px"
  workbench: "26px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  7: "28px"
  8: "32px"
  10: "40px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent-action}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.field}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.panel}"
    padding: "18px"
  rail:
    backgroundColor: "{colors.rail}"
    rounded: "{rounded.panel}"
    padding: "14px 8px"
    width: "76px"
  status-badge:
    rounded: "{rounded.rail-item}"
    padding: "5px 10px"
---

# Design System: IPI QC Microbiology Operations Dashboard

## Overview

**Creative North Star: The Laboratory Workbench.** The approved paper/lime/graphite concepts establish a precise, tactile instrument workspace. A floating graphite rail, pearl and sage grouped surfaces, soft lime selection, and original laboratory illustrations give the product its identity. Dark mode translates the same hierarchy into charcoal; it does not introduce a different visual language.

Dense records stay readable through alignment, restrained boundaries, and deliberate whitespace. Stable text, tables, and forms carry the work; depth and short movement belong chiefly to graphics and controls. The interface supports sample intake, source review, result entry, and report preparation. External review, signature, and sample release remain outside the application.

**Key Characteristics:**

- Graphite instrument rail and rounded grouped work surfaces.
- Lime selection and primary actions, with amber reserved for attention.
- Compact Inter typography and explicit sample provenance.
- Decorative dish, assay, vessel, and document SVGs that never encode measurements.
- Interaction-bound motion, keyboard access, and responsive workflow layouts.

The effective source is the final layer in `src/laboratory.css`, with semantic colors, typography, and spacing inherited from `src/styles.css`. Earlier CSS declarations are not the palette or shape authority. Product truth remains in `PRODUCT.md`; route-specific verification belongs in `docs/concept-overhaul.md`.

## Colors

Lime supplies the active instrument cue; neutral paper, sage, and charcoal provide the working field. The frontmatter records the implemented dark defaults and light equivalents.

### Primary

- **Soft lime:** Selection layers, switches, and the primary action share the accent-action color in both themes. Use graphite ink on filled lime.
- **Moss:** Light-mode accent text, links, and focus use the darker light-accent so small text remains legible.

### Neutral

- **Graphite rail:** The navigation rail remains graphite in both themes.
- **Lab paper / charcoal:** App backgrounds frame quieter surface and elevated-surface groups. Elevated here is a tonal role, not a requirement for shadows.
- **Primary, secondary, tertiary ink:** Distinguish identity, supporting information, and metadata without reducing essential content to faint decoration.
- **Quiet boundaries:** Use border-subtle for grouped surfaces and border-strong when interactive or floating boundaries require it.

### Semantic

Success, warning, critical, and information colors retain their theme-specific source values. Pair every status color with explicit text. Amber flags attention; it does not become a second primary-action palette. A displayed `RELEASED` value is a source status, not an application release action.

**The One Voice Rule.** Filled lime marks selection or the main safe action. It should not outline every container or imply laboratory approval.

## Typography

Self-hosted Inter and the existing system sans stack provide all ordinary interface typography. Use the system mono stack for real ML numbers, hashes, identifiers, and technical values.

- **Page headline:** `clamp(24px,2vw,28px)`, weight 600, line-height 1.2, tracking `-.035em`; mobile headings use 26px.
- **Section headings:** Existing queue/activity headings use 20px. Workflow headings use 15px desktop and 16px mobile.
- **Body:** 14px base; records, controls, and descriptions commonly use 13px.
- **Labels:** 12px, generally weight 500. Table headers and tertiary metadata use 11px.
- **Wordmark:** 40px desktop and 29px mobile. This scale is specific to the workspace wordmark, not a new hero-heading rule.

**The Data Is Not Decoration Rule.** Never turn invented values or illustrative graphics into measured data merely to fill the layout.

## Layout

The desktop rail is 76px wide, inset 26px from the top, left, and bottom. Its optional expanded state is 218px. The applied main-wrapper margin is 112px. The `--sidebar-collapsed:100px` and `--sidebar-expanded:240px` variables are shell allocation tokens; they do not describe the visible rail width. Mobile navigation is a 250px drawer below the 767px breakpoint.

Normal density is the default. Content is constrained to 1800px, with desktop padding `8px 24px 28px`. The top bar has a 76px minimum height and `14px 24px` padding. Mobile uses a 68px top bar, `12px 16px` top-bar padding, and content padding `10px 16px 80px`. The 4px rhythm remains the base. Global padded panels use 18px interiors on desktop and 20px on mobile; workflow interiors remain compact. The dashboard main-section gap is 16px; its queue/activity column gap remains 24px.

The selected-sample workbench groups identity, source information, tests, a report draft, and actions. Connectors appear only for actual relationships. This explicit group is an intentional exception to the usual preference for shallow container nesting; do not apply its nesting to every route. The queue and secondary activity field remain independently scannable.

- From 1151px through 1350px, a compact workbench keeps the two-column action grid alongside the workflow. From 1051px through 1150px, actions move to a six-column row.
- At 1050px, top navigation tabs yield to the rail; identity spans the workbench, three workflow groups sit below it, and the queue/activity layout becomes one column.
- At 767px, the rail becomes a drawer, workbench groups stack, and actions use two columns. Controls and tabs gain 44px minimum height.
- Tables scroll within a deliberate local region when their data needs more width. Other content must not widen the document.

Context illustrations are 88×64px; desktop page-header graphics are 64×56px (58×58px on mobile). Keep a 20–24px gap between contextual illustrations and headings. Preserve keyboard navigation, explicit actions, and visible recovery states at every width.

## Elevation & Depth

Working surfaces are flat, using tone and thin borders rather than ambient glow. The rail uses `0 8px 24px rgba(20,25,16,.1)` for structural separation. Dialogs use `0 24px 80px rgba(0,0,0,.25)` with a dim backdrop. SVG illustrations carry their own bounded gradients, strokes, and grounding shadows; these do not justify glass effects across the UI.

**The Stable Surface Rule.** Text, tables, forms, and reference copy remain still. Decorative ambient backdrops and continuous laboratory loops are disabled. Depth helps a control or object respond; it does not compete with the data.

## Shapes

The approved world uses generous, deliberate rounding: 16px controls, 28px main panels and rail, 22px workflow panels, 26px dialogs, 18px action tiles, and 26px desktop workbench grouping (28px on mobile). Inputs use 12px corners. Pills and sliding selection layers belong to navigation and compact selectors; badges use 20px rounding. Borders remain 1px and restrained.

Do not restore the obsolete 6–8px control / 12px panel rule. Do not prohibit assay circles or dish geometry: these are now intentional decorative objects, explicitly separate from measured values.

## Components

### Buttons and fields

Primary buttons use lime with graphite ink; secondary buttons use an elevated neutral surface. Buttons have a 42px desktop minimum height, 16px corners, and `10px 16px` padding. Inputs use an elevated surface, a 1px boundary, 12px corners, and 42px minimum height. Disabled controls retain legible labels and explanatory context. Focus uses the existing 2px accent outline with 2px offset; labels remain associated with controls.

### Navigation and selectors

Desktop rail targets are 58px wide and at least 54px tall, with 20px corners. A shared lime layer moves beneath the active target. Workspace tabs and segmented selectors retain native link/button semantics and immediate activation. Mobile drawer labels remain visible. Global search remains available through an explicit trigger and keyboard shortcut.

### Records and workbench

Align sample identity, ML number, batch, source, and stored status. Show absent information explicitly as `Not recorded`, `No related draft`, or the applicable source/result state. Workbench graphics are `aria-hidden` and do not encode progress or results. Keep source/history and next actions reachable without hover.

### Dialogs and assistant

Use the shared native modal dialog for confirmations and command surfaces, with an accessible title and explicit close control. The assistant drawer is 420px wide on larger screens, bounded by the viewport, and establishes a separate modal layer rather than overlapping active work. Preserve existing loading, empty, error, unsaved, and read-only behavior.

### Motion

Press feedback is 100ms; selector movement is 180ms; panel/dialog arrival is 220ms, using `cubic-bezier(.22,.8,.25,1)`. A sample connector may pulse once for 550ms on selection. Routine feedback does not delay focus or action. Fine mouse input may tilt an illustration gently; touch does not receive pointer tilt.

Reduced motion removes spatial reveals, decorative movement, and selector transitions. Motion-off and constrained-device modes suppress object movement and connector pulses; hidden-document state pauses animations. Retain these existing hooks. Do not canonize old continuous orbital, particle, badge, assistant-bobbing, or ambient-gradient loops.

## Do's and Don'ts

### Do:

- **Do** follow the approved paper/lime/graphite hierarchy in both themes.
- **Do** preserve real provenance, result states, revisions, and source status beside sample identity.
- **Do** extend shared controls and use typography/alignment before adding containers.
- **Do** keep illustrations decorative and motion short, bounded, and optional.
- **Do** verify desktop/mobile rendering, keyboard use, local scrolling, reduced motion, and error/empty states.

### Don't:

- **Don't** fabricate measurements, due dates, operational metrics, approval, signatures, or release state.
- **Don't** restore teal actions, small generic panel corners, ambient glow, or continuous decorative loops.
- **Don't** use oversized KPI blocks, repeated nested cards, or hover-only essential information.
- **Don't** allow persistent assistant UI or horizontal document overflow to obscure work.
- **Don't** import map, warehouse, or CRM content from the visual references into laboratory records.


