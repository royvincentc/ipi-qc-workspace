---
name: IPI QC Microbiology Operations Dashboard
description: A calm, traceable laboratory operations console for sample intake, review, and report preparation.
colors:
  app-bg: "#081117"
  surface: "#101B23"
  surface-elevated: "#15242E"
  surface-hover: "#1A2C38"
  text-primary: "#F5F7F8"
  text-secondary: "#A7B1BA"
  text-tertiary: "#75818B"
  accent-teal: "#2DD4BF"
  accent-teal-hover: "#26B2A0"
  success: "#34D399"
  warning: "#FBBF24"
  critical: "#F87171"
  info: "#60A5FA"
  border: "rgba(255, 255, 255, 0.08)"
  border-strong: "rgba(255, 255, 255, 0.15)"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  data:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  control: "8px"
  panel: "12px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent-teal}"
    textColor: "{colors.app-bg}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  input:
    backgroundColor: "{colors.app-bg}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "36px"
  status-badge:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  sample-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
---

# Design System: IPI QC Microbiology Operations Dashboard

## Overview

**Creative North Star: "The Lab Notebook, Made Operational"**

The interface should feel like a well-kept laboratory notebook translated into a fast digital workbench: legible, traceable, immediately useful, and quietly alive. The visual system serves routine QC work rather than marketing, but it is allowed to have atmosphere. Hierarchy comes from typography, alignment, state, and motion that supports the sense of a living laboratory system.

The approved redesign direction is a laboratory operations console with a cinematic motion layer. It keeps the current dashboard’s animated hero, atmospheric background, laboratory mark, soft glow, and assistant personality while improving work-queue hierarchy and responsive ergonomics. Linear informs information density and calm navigation; Vercel informs contrast and action restraint; Raycast informs command-first search and compact result handling. Their branding and layouts are not copied.

**Key Characteristics:**

- Dense information with deliberate whitespace.
- Traceability visible beside every sample identity.
- Fewer, clearer surfaces with restrained borders.
- One obvious primary action per workflow.
- Motion used as atmosphere, feedback, and orientation—with a deliberate budget.
- Responsive rows designed for touch rather than compressed desktop tables.

**The Work-First Rule.** The current attention queue and next safe action must appear before decorative context.

## Colors

The palette is a deep teal-navy neutral field with cool text and a scarce mint-teal action color. Semantic colors communicate laboratory state and must not become decoration.

### Primary

- **Operational teal** (`#2DD4BF`): Primary actions, active controls, focus emphasis, and verified positive state.
- **Operational teal hover** (`#26B2A0`): Hover and pressed-state refinement for primary actions.

### Secondary

- **Information blue** (`#60A5FA`): Informational state only.
- **Success green** (`#34D399`): Completed or released state only.
- **Warning amber** (`#FBBF24`): Pending, unresolved, or review-needed state.
- **Critical red** (`#F87171`): Blocking errors, duplicates, and unsafe conditions.

### Neutral

- **App field** (`#081117`): Overall canvas and recessed input backgrounds.
- **Surface** (`#101B23`): Primary working surface.
- **Elevated surface** (`#15242E`): Menus, selected controls, and elevated context.
- **Hover surface** (`#1A2C38`): Interactive hover and selected-row treatment.
- **Primary text** (`#F5F7F8`): Record identity and headings.
- **Secondary text** (`#A7B1BA`): Supporting descriptions and metadata.
- **Tertiary text** (`#75818B`): Hints, timestamps, and low-priority labels.

**The One Voice Rule.** Teal is scarce. It should identify the next action or a meaningful operational state, not outline every container.

## Typography

**Display Font:** Inter with system sans fallbacks.

**Body Font:** Inter with system sans fallbacks.

**Label/Mono Font:** System monospace for ML numbers, hashes, identifiers, and measured values only.

**Character:** Compact, neutral, and highly legible. Weight and alignment should create hierarchy; uppercase labels and monospace text are supporting instruments, not the personality of the product.

### Hierarchy

- **Display** (600, `clamp(2rem, 4vw, 3.5rem)`, 1.05): Reserved for a small number of orientation moments; never use it to push operational content below the fold.
- **Headline** (600, `24px`, 1.2): Page titles and major workflow headings.
- **Title** (600, `18px`, 1.3): Section titles and record groups.
- **Body** (400, `14px`, 1.5): Instructions, descriptions, and ordinary record text.
- **Label** (500, `12px`, 1.3): Field labels, table headers, and compact metadata.
- **Data** (500, `12px`, 1.4): ML numbers, batches, audit identifiers, and technical values.

**The Data Is Not Decoration Rule.** Use monospace only when the value is a real identifier, code, hash, or measurement.

## Layout

The desktop shell uses a persistent navigation rail, a sticky utility bar, and a constrained content region. The main dashboard should prioritize the work queue, with secondary intelligence and activity content placed beside it only when space permits.

- Expanded sidebar: approximately `220px`.
- Collapsed sidebar: approximately `68px`.
- Desktop content padding: `32px` maximum rhythm.
- Mobile content padding: `14–18px`.
- Base spacing unit: `4px`, with most UI rhythm built from `8px`, `12px`, `16px`, and `24px`.
- Desktop dashboard: queue-first main column with optional secondary rail.
- Tablet: secondary rail moves below the queue; primary action remains visible.
- Mobile: navigation becomes a drawer; tables become explicit record rows; no element may widen the document beyond the viewport.
- Minimum touch target: `40px`, with `44px` preferred for primary mobile controls.

The dashboard should not require a large hero to establish context. A compact page heading and attention summary should preserve more space for samples.

**The No-Spill Rule.** At `390px`, `768px`, and every intermediate width, document width must equal viewport width unless a deliberate, locally scrollable data region is present.

## Elevation & Depth

Depth is primarily tonal: app field, surface, and elevated surface should establish structure before shadows do. Borders are quiet and used to define interactive boundaries. Blur and translucency are reserved for genuinely floating layers such as a drawer or modal, not for every panel.

### Shadow Vocabulary

- **Low structural shadow:** `0 4px 24px rgba(0, 0, 0, 0.12)` for occasional elevated context.
- **Floating shadow:** `0 16px 48px rgba(0, 0, 0, 0.35)` for dialogs, drawers, and the open assistant.
- Avoid combining a prominent border, strong blur, large shadow, and glow on the same ordinary card.

**The Flat-by-Default Rule.** Resting operational surfaces should feel stable and readable. Atmospheric motion may live behind the workflow, but surfaces should not all compete with blur, glow, and elevation at once.

## Shapes

The shape language is gently rounded but controlled. Controls use `6–8px` corners; working panels use `12px`; pills are reserved for compact status or filter states. Avoid turning every section into a rounded card.

- Borders are normally `1px` and low contrast.
- No thick colored side borders on ordinary cards or rows.
- Table rows should read as a continuous field on desktop and as individual records on mobile.
- Focus rings must be visible and use the accent color with sufficient contrast.
- Large decorative circles, orbit rings, and geometric masks are not part of the operational foundation.

## Components

### Buttons

- **Shape:** Compact, gently rounded controls (`8px`).
- **Primary:** Teal fill, dark text, `36px` desktop height, full-width when mobile layout requires it.
- **Hover / Focus:** Explicit color and border changes; subtle `100–160ms` feedback; visible `:focus-visible` ring.
- **Secondary / Ghost:** Tonal surface or transparent background with restrained border; never compete with the primary action.
- **Active:** Subtle press response around `scale(0.97)` where appropriate.

### Status badges

- Use compact labels for operational state, not for navigation.
- Keep state text explicit: `ON-GOING`, `RELEASED`, `Duplicate ML`, `Not entered`, `Not tested`.
- Do not use color alone to communicate state.

### Cards / Containers

- **Corner style:** `12px` for working panels; `6–8px` for compact controls.
- **Background:** Tonal surfaces from the neutral scale.
- **Shadow strategy:** Flat by default; floating only when layered.
- **Border:** One restrained border where structure or focus requires it.
- **Internal padding:** `16px` standard, `24px` for major sections.
- Prefer one surface for a workflow section over nested cards inside cards.

### Inputs / Fields

- **Style:** Recessed app-field background, `1px` border, `8px` radius, `36px` minimum height.
- **Focus:** Accent border plus a clear, non-layout-shifting focus ring.
- **Error / disabled:** Preserve readable contrast and explain recovery; do not rely on a red border alone.
- Labels should remain visible and associated with their controls.

### Navigation

- **Desktop:** Persistent rail with short labels, clear active state, and a distinct system/settings group.
- **Mobile:** Drawer opened from the utility bar, with focus returned to the trigger on close.
- **Active state:** Tonal background and accent text/icon; avoid excessive glow.
- **Keyboard:** Navigation, global search, and primary actions must be reachable without a pointer.

### Motion system

- **Atmospheric layer:** Slow ambient gradients, particles, orbital geometry, and soft laboratory light may establish the dashboard mood. Keep them behind content, low contrast, and GPU-friendly.
- **Hero motion:** The home dashboard may use a restrained animated hero with a laboratory mark, orbital motion, soft floating elements, or a short text reveal. It should establish orientation without delaying the work queue.
- **Route motion:** Use a short route-arrival transition to preserve spatial continuity. Prefer transform, opacity, and modest blur; keep it under `300ms`.
- **Interaction motion:** Buttons, filters, tabs, drawers, and assistant states should respond immediately. Use `100–200ms` transitions and subtle press feedback.
- **Expressive motion:** The assistant character and occasional status moments may have personality, but must never obscure a sample action, input, or table row.
- **Reduction:** `prefers-reduced-motion` removes ambient drift, typing effects, bobbing, and nonessential route reveals while preserving state changes and focus feedback.

**The Motion Budget Rule.** Use one strong atmospheric layer, one clear hero moment, and small responsive interactions. Do not stack multiple competing animations in the same visual region.

### Work queue / sample row

- Sample name and ML number form the primary identity block.
- Category, batch, received date, source status, and traceability remain visually aligned secondary data.
- The primary row action should be explicit and reachable at the trailing edge.
- On mobile, use a stable two- or three-line record layout with a dedicated action area rather than relying on hidden columns.

### Search / command surface

- Global search is a first-class workflow for ML number, product, batch, and source lookup.
- Open and close should be immediate for frequent keyboard use.
- Results should support keyboard movement, visible selection, and direct navigation.
- Include commands for common safe actions without turning the product into a generic command center.

### Assistant

- Visible as a quiet personality layer on the dashboard, but never allowed to obscure work. It may be minimized or hidden by preference.
- Available through an explicit, accessible trigger.
- Must never cover sample actions, table rows, form controls, or mobile navigation.
- Keep the full assistant page available as the primary conversational surface.

## Do's and Don'ts

### Do:

- **Do** put the current attention queue and safe next action above decorative context.
- **Do** preserve visible provenance: source sheet, section, row, revision, and status.
- **Do** use typography and alignment before adding another card or border.
- **Do** make filters compact, labeled, and easy to clear.
- **Do** keep sample identity and ML numbers readable at a glance.
- **Do** test every significant screen at `1440×900`, `1280×800`, `1024×768`, `768×1024`, and `390×844`.
- **Do** treat keyboard focus, reduced motion, loading, empty, error, and disabled states as part of the design.
- **Do** use motion only when it explains state, spatial relationship, or input feedback.

### Don't:

- **Don't** use oversized KPI cards as the main structure of an operational page.
- **Don't** allow persistent assistant UI to overlap work.
- **Don't** let gradients, glow, glass, or ambient animation compete with the work queue; atmospheric effects belong behind content and should remain restrained.
- **Don't** introduce horizontal document overflow on mobile.
- **Don't** hide important table information behind hover-only interactions.
- **Don't** use excessive pills, nested cards, or decorative badges.
- **Don't** animate frequent keyboard-driven actions.
- **Don't** fabricate operational metrics, due dates, progress, or laboratory conclusions.
- **Don't** copy Linear, Vercel, or Raycast branding or page layouts; use only the documented interaction principles.
