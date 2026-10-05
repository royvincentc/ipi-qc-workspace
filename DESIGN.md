---
name: IPI QC Microbiology Operations Dashboard
description: A calm, traceable laboratory operations console for sample intake, review, and report preparation.
colors:
  app-bg: "#121613"
  surface: "#191e1a"
  surface-elevated: "#202620"
  surface-hover: "#282f27"
  text-primary: "#f1f3eb"
  text-secondary: "#bdc3b7"
  text-tertiary: "#8c9386"
  accent: "#53652a"
  accent-action: "#d8e987"
  accent-hover: "#465721"
  success: "#34D399"
  warning: "#FBBF24"
  critical: "#F87171"
  info: "#60A5FA"
  border: "rgba(227, 235, 216, 0.10)"
  border-strong: "rgba(227, 235, 216, 0.18)"
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
  small:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
  micro:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.35
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
  journey-board: "26px"
  journey-board-compact: "21px"
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
    backgroundColor: "{colors.accent-action}"
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

The current visual direction is Graphite + Lab Paper + Soft Lime: graphite navigation, quiet paper-like surfaces in light mode, charcoal surfaces in dark mode, precise separators, compact controls, and a soft lime primary action. The existing Inter/system typography, route-specific assay SVGs, and responsive shell keep the interface grounded in laboratory operations. On the dashboard, a connected journey canvas adapts the CRM reference's left-to-right task flow to actual sample intake, source records, and report drafts; its records remain traceable links rather than invented people or workflow statuses.

**Key Characteristics:**

- Dense information with deliberate whitespace.
- Traceability visible beside every sample identity.
- Fewer, clearer surfaces with restrained borders.
- One obvious primary action per workflow.
- Motion used as atmosphere, feedback, and orientation—with a deliberate budget.
- The dashboard journey draws its route on entry; each node exposes a real destination, and prefers-reduced-motion removes entrance choreography.
- Responsive rows designed for touch rather than compressed desktop tables.

**The Work-First Rule.** The current attention queue and next safe action must appear before decorative context.

## Colors

The palette is graphite with calm lab-paper surfaces and a scarce soft-lime action. A deeper moss accent is used for small text and icons in light mode; lime fills carry dark text for clear action contrast. Semantic colors communicate laboratory state and must not become decoration.

### Primary

- **Soft lime action** (`#D8E987`): Primary action fills and active emphasis; dark graphite text sits on the fill.
- **Moss accent** (`#53652A`): Link, icon, and focus emphasis in light mode.
- **Moss hover** (`#465721`): Hover state for light-mode accent text.

### Secondary

- **Information blue** (`#60A5FA`): Informational state only.
- **Success green** (`#34D399`): Completed or released state only.
- **Warning amber** (`#FBBF24`): Pending, unresolved, or review-needed state.
- **Critical red** (`#F87171`): Blocking errors, duplicates, and unsafe conditions.

### Neutral

- **App field** (`#121613`): Dark-mode canvas.
- **Surface** (`#191E1A`): Primary working surface.
- **Elevated surface** (`#202620`): Menus and selected controls.
- **Hover surface** (`#282F27`): Interactive hover and selected-row treatment.
- **Primary text** (`#F1F3EB`): Record identity and headings.
- **Secondary text** (`#BDC3B7`): Supporting descriptions and metadata.
- **Tertiary text** (`#8C9386`): Hints, timestamps, and low-priority labels.

**The One Voice Rule.** Lime is scarce. Use filled lime for primary actions; use the darker moss accent for small text, icons, links, and focus in light mode. Do not outline every container.
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
- **Workflow motion:** Dashboard arrival traces the sample journey from intake through records to reports. Keep content visible immediately and cap the sequence at `400ms` including stagger.
- **Route motion:** Use a short route-arrival transition to preserve spatial continuity. Prefer transform, opacity, and modest blur; keep it under `300ms`.
- **Surface motion:** Navigation, cards, tables, tabs, filters, form fields, status, and assistant controls each get a state-specific response. Use `100–220ms` for routine feedback and avoid moving static reference copy.
- **Record motion:** Stagger rows and timeline items by no more than `110ms`; their shared arrival should make sample identity and status scan as a unit.
- **Expressive motion:** The assistant character and occasional status moments may have personality, but must never obscure a sample action, input, or table row.
- **Reduction:** `prefers-reduced-motion` removes ambient drift, typing effects, bobbing, and nonessential route reveals while preserving state changes and focus feedback.

**The Motion Budget Rule.** Motion should be present throughout the working surface, with one active focal area at a time. Keep atmosphere behind the data, use short responses on each control, and reserve continuous loops for the low-contrast ambient layer and meaningful live states.

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

## Visual system update — 2026-10-05

The selected direction is **Graphite + Lab Paper + Soft Lime**. The lab workbench is neutral and precise: graphite navigation, quiet paper-like working surfaces in light mode, charcoal surfaces in dark mode, thin boundaries, and a soft lime accent reserved for active navigation, focus, and primary actions. Existing semantic colors continue to communicate operational status.

The existing Inter/system typography, 4px spacing rhythm, route-specific assay SVGs, and workflow behavior remain the foundation. Surfaces are flat by default; shadows are limited to small structural separation. Existing motion and low-performance hooks remain in place, and reduced-motion settings retain a static route mark. The design reference screenshots informed density, alignment, compact controls, and restrained accent use; their map, warehouse, and CRM content is not part of IPI.

This update changes visual presentation only. It does not change record meaning, sample release, report approval, signature state, permissions, integrations, or persisted data.





