# Reports Equipment Quantities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build environmental equipment selection with quantities and a guided Reports and Results workbench, then verify and deploy it.

**Architecture:** Derive a catalog from applicable approved surface definitions and compose pinned method outputs from selected quantities on the server. Extend existing draft/session creation and result remark helpers; keep historical snapshots and non-surface selection compatible. Improve the existing report components and scoped styles without introducing dependencies.

**Tech Stack:** React/TypeScript, Express/Zod, existing PostgreSQL/PGlite storage, CSS, existing Python DOCX worker.

**Spec:** `docs/superpowers/specs/2026-10-13-reports-equipment-quantities-design.md` (approved by the user).

## Global Constraints

- Equipment quantities apply only to environmental surface-swab samples.
- No changes to RLU versus cfu/mL logic, thresholds, qualifiers, Nmt reporting behavior, report signatures, sample release, or source-sheet values.
- Existing saved drafts and generated files retain their original rows, equipment names, pinned specifications, and revisions.
- Positive quantities must be integers; expanded output instances remain within the existing 300-row limit.
- Client-supplied standards are never trusted. Approved coverage, source revisions, dates, and templates must be checked server-side.
- No new dependencies or destructive data migration. Preserve unrelated working-tree files.

## Review Focus

- Conflicting approved definitions for the same equipment must block that equipment, not select by database order (Task 1).
- A quantity cannot omit points from the companion output, overflow an output, or bypass revision validation (Tasks 1–2).
- Raw imported qualifiers/units must not be interpreted as the manual Nmt action; unknown text stays undecided (Task 3).
- Manual remark overrides must survive edited values, saves, and reloads (Task 3).
- Switching samples/methods, narrow viewports, and unsaved changes must not lose entries or expose stale setup (Task 4).

### Task 1: Approved equipment catalog and composition

**Files:** Create `shared/environmental-equipment.ts`, `tests/environmental-equipment.test.ts`; modify `shared/environmental.ts`.

**Interfaces:** `resolveEnvironmentalEquipment(sample: Sample, productId: string, profiles: EnvironmentalProfile[], templates: Template[], selection: EnvironmentalSelection): EnvironmentalSetup`; optional quantity selection/catalog/source metadata on existing shared types. Legacy `resolveEnvironmentalProfile` remains available for non-surface and legacy tests.

- [x] Write tests for independent quantities across historical combinations, both methods' matching points, distinct criteria, numbered suffix normalization, conflicting definitions, integer/row limits, unknown equipment, custom-label uniqueness, and source revision changes.
- [x] Run `npx tsx --test tests/environmental-equipment.test.ts`; expect failing assertions for missing composition.
- [x] Implement the catalog and composition, preserving approved provenance and pinned template checks. No nearest-combination matching.
- [x] Run `npx tsx --test tests/environmental-equipment.test.ts tests/environmental.test.ts`; expect all pass.

### Task 2: Server setup, validation, and paired drafts

**Files:** Modify `server/reports.ts`, `server/index.ts`, `tests/environmental-session.test.ts`, `tests/environmental-workflow.test.ts` as required; add `tests/environmental-equipment-workflow.test.ts`.

**Interfaces:** Add validated equipment selection to `POST /api/report-setup/:sampleId` and `POST /api/drafts`. Existing GET setup and non-surface `profileId/outputId` remain compatible. Setup produces composed outputs and pinned equipment sources; draft creation preserves these in both snapshots.

- [x] Write integration tests for quantities required on surface drafts, atomic pair creation, independent blank measurements, exact point rows, snapshot persistence, and non-surface legacy compatibility.
- [x] Run the new integration test; expect failure before server wiring.
- [x] Wire the server resolver, selection schema, snapshot provenance, and paired creation. Reject requests missing or using stale quantities; keep result identities immutable after creation.
- [x] Run the environmental workflow/session tests; expect all pass. Verify existing report row generation already represents expanded rows; change the worker only if a concrete rendering failure requires it.

### Task 3: Automatic remarks and persistent analyst overrides

**Files:** Modify `shared/model.ts`, `server/reports.ts`, `server/index.ts`, `src/analyst-remarks.tsx`, `tests/result-remarks.test.ts`; add focused save/integration assertions in existing report tests.

**Interfaces:** Optional `remarkMode: 'automatic'|'manual'` on `Result`; helpers for safe imported-result interpretation and updating row remarks, reusing `suggestedAnalystRemark`. Legacy nonblank remarks imply manual mode.

- [x] Write failing tests for imported numeric values with units, recognized findings, unknown/qualified text, automatic recalculation, blank results, and persistent manual override/reset.
- [x] Run the remark tests; expect the new behavior to fail.
- [x] Initialize suggestions on import, preserve raw source fields, validate/persist remark mode, and share edit logic between client/server. Do not add an unconfirmed environmental sheet mapping.
- [x] Run remark and report save tests; expect unchanged method boundary tests and new override tests to pass.

### Task 4: Workbench UI, rendered verification, review, and rollout

**Files:** Modify `src/reports.tsx`, `src/report-design.css`; create focused `src/environmental-equipment.tsx` if extracting the quantity controls makes the existing report file easier to maintain. Extend existing controls and lab graphics.

**Interfaces:** Quantity controls consume the server catalog and emit validated selection/labels; POST preview is versioned against the catalog. The existing method editor uses shared remark helpers and immutable snapshot rows.

- [x] Add the equipment/quantity list, optional labels, preview, method output summary, and scoped motion.
- [x] Bound/search saved sessions, provide source/import status, compact equipment result grouping, completion navigation, and persistent automatic/manual remark feedback. Preserve save and unsaved protection.
- [x] Run `npm test`, `npm run build`, and relevant worker tests; expect all pass.
- [x] Start an isolated de-identified demo server, interact with setup/result entry/save/reload/paired preview on desktop/mobile, both themes, keyboard, and reduced motion. Inspect generated DOCX/PDF rows.
- [x] Run Impeccable detector and critique/audit; fix significant findings in one bounded pass.
- [x] Independent whole-change review; fix substantive findings and verify affected checks.
- [ ] Commit only intended files, integrate into production master without overwriting unrelated changes, push, confirm Render deployment is live, and verify the original environmental sample's new setup without entering fabricated laboratory measurements.

## Execution notes

- User authorized execution and production rollout with “proceed”; no further plan approval is required.
- Managed worktree creation succeeded, but sandbox prevented writes there. Per worktree skill fallback, work in the permitted project directory on `codex/reports-equipment-quantities`; unrelated dirty files are preserved. The unused managed worktree was queued for archive.
- Track task checks and rulings in `tmp/reports-quantities-progress.md` across compaction.
