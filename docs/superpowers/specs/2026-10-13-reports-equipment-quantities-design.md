# Reports and Results: equipment quantities and guided result entry

Date: 2026-10-13 (Asia/Taipei)
Status: Design for user review; independent builder check found no material unanswered questions. No application implementation yet.

## Intended outcome

An analyst preparing an environmental surface-swab report selects the equipment used and enters quantities, instead of finding a previously recorded combination of numbered equipment. The selection builds one shared list of sampling points for SPCMY and Accupoint. Each method keeps its established tests, units, limits, result formatting, remarks rules, and separate report.

Reports and Results becomes a focused workbench: choose a sample, confirm equipment where applicable, enter or review results, and preview documents. Sheet results and their provenance are visible; safely interpretable results receive automatic Analyst Remarks immediately, while analysts retain control over final remarks.

## Confirmed scope and boundaries

- Equipment quantities apply only to environmental surface-swab samples. SFG, FG, stability, and miscellaneous equipment, applicability, specifications, and report calculations remain as they are.
- Shared Reports and Results presentation, imported-result feedback, and automatic remarks improve the existing entry workflow for supported sample types, including those non-environmental categories. This does not change their scientific rules.
- Environmental open-plate, water-validation, GIP, and phase-air outputs keep their existing location, phase, channel, and replicate selection. They receive the general usability improvements, but quantities must not turn these into surface-swab reports.
- Existing saved drafts and generated files retain their original rows, equipment names, pinned specifications, and revisions. Existing approved pattern records remain evidence; they are not deleted or rewritten into guessed combinations.
- No changes to RLU versus cfu/mL logic, thresholds, qualifiers, Nmt reporting behavior, report signatures, sample release, or source-sheet values.

## 1. Equipment setup

After the analyst selects an environmental sample, show its ML number, product, context, facility, and area above a compact equipment list. Derive the available equipment types from matching, active, effective approved evidence for that exact product/context/facility/area.

Example of the proposed control layout (quantities are illustrative, not sample data):

| Include | Equipment | Quantity |
| --- | --- | --- |
| Selected | Stainless Drum | −  3  + |
| Selected | Stainless Pail | −  2  + |
| Selected | Inlet Hose | −  1  + |
| Not selected | Nozzle | Add |

The user can select equipment independently, type a whole-number quantity, or use accessible decrement/increment buttons. Selecting a type starts at one; removing it sets it to zero. Selection is empty initially, so the application never asserts that equipment was sampled. Quantity controls stay visible for selected equipment; a search filters longer lists without hiding the selection summary.

The preview shows exactly the rows that will be created: three Stainless Drum rows, two Stainless Pail rows, and one Inlet Hose row in this example. Each numbered item gets its own result entry, rather than one value copied across the quantity.

Builder choices to review:

- Default row labels use deterministic numbering within this session (for example, Stainless Drum 1–3). These numbers are sampling-point labels, not proof of a physical asset identifier.
- A compact, optional “Edit equipment labels” disclosure lets the analyst retain observed identifiers such as Drum 3 and Drum 4 when necessary. It does not reintroduce numbered pattern choices. Labels must remain unique and nonblank; imported equipment results cannot be matched by assuming that a generated ordinal is an asset ID.
- Positive quantities must be integers. Validate the expanded instances against the existing maximum of 300 rows per output, counting each method's actual test instances; do not invent a separate arbitrary equipment limit.
- Unapproved equipment is not offered with guessed criteria. Explain which equipment or method lacks approved coverage and link to the existing configuration workflow.

## 2. Replace combination matching with evidence-based composition

Numbered variants of the same equipment can be collapsed only when the approved method/test definitions, units, criteria, stage, block, channel, and compatible layout are equivalent. Remove only recognized equipment-instance suffixes, never digits that identify a facility, phase, model, or other meaningful variant. Use explicit catalog identity wherever the existing data supplies it.

For each selected equipment type, use its approved per-method definitions and expand them for the requested quantity. A combination need not have appeared in a historical pattern. Do not choose the nearest historical combination, rank it probabilistically, or infer that a swab occurred.

Both surface methods receive the same selected point identities and ordering. Accupoint creates its existing RLU test instance per point; SPCMY creates its existing SPC/MY or otherwise approved test instances per point. Never copy a criterion or measurement from one method to the other. Both methods must have approved coverage for a selected point before the paired flow is enabled; do not silently omit equipment from one report.

Genuinely different standards or layouts must remain distinct. When the applicable evidence disagrees, show the conflict and require an explicit supported protocol choice or administrator reconciliation. Equipment quantity never resolves a standards conflict. Preserve product, context, facility, area, effective-date, active-template, and source-change checks.

The server reconstructs and validates the composition from submitted equipment IDs, quantities, labels, and pinned source revisions. The client never submits trusted criteria. Store the equipment selection, generated point IDs, per-method criteria provenance, and template revisions in the existing environmental draft snapshot/session structure. Do not label a newly composed session as a newly approved pattern, or fabricate approval metadata. Reuse existing paired-session creation and its all-or-nothing transaction.

Once drafts are created, their point identities are fixed. To change quantities, return to setup and create a new draft session; do not drop measurements or remap entered values onto different equipment. Unsubmitted setup edits update both previews immediately.

## 3. Reports and Results workbench

Retain the app's laboratory workbench identity: Inter typography, graphite/paper surfaces, sage grouping, lime primary actions, restrained borders, and compact aligned data. Extend existing controls, Dialog, ResultToggle, AnalystRemarks, and lab graphics.

The route has a clear sequence:

1. **Choose sample:** searchable sample selection with ML/product/batch identity and source link. Saved drafts are a searchable, bounded list rather than an indefinitely tall competing column. Group paired environmental drafts as one session with both methods.
2. **Confirm setup:** equipment selection and quantities for surface samples, followed by a compact preview of points, tests, and method-specific standards. Other samples retain their existing applicable-test setup.
3. **Enter results:** a stable sample header, SPCMY/Accupoint method switch for paired sessions, completion counts derived from actual rows, source status, and a compact equipment-oriented entry grid.
4. **Review and preview:** existing validation, saved revision, report details, paired PDF generation, and download actions. Clearly identify the method in each preview.

The desktop result grid groups the parameters of an equipment point together, with columns for point, parameter/standard, actual result, and Analyst Remarks. Unit labels remain beside inputs. SPCMY and Accupoint keep their existing distinct input choices. Incomplete rows and errors are shown beside the relevant inputs; the header can navigate directly to incomplete rows. Keyboard Tab order follows equipment, then parameter, and no animation delays typing or focus.

On mobile, each equipment group becomes a compact stacked section with the same label/result/remark order. Method switching, save status, and review action remain reachable without obscuring the active input. Dense review tables scroll within their own region, not the entire document. Preserve viewer read-only access and existing unsaved-change protection.

Saving provides explicit busy, success, conflict, and error feedback. Show a single primary next action appropriate to the current stage. Keep existing explicit save/revision semantics; no new autosave system or hidden spreadsheet writes.

## 4. Imported results and automatic Analyst Remarks

Current evidence: the existing IPI Results reader maps ML number plus test for supported non-environmental tabs. Environmental lookup is intentionally excluded and has no configured equipment-level mapping. The editor already uses `suggestedAnalystRemark` after a result change, but draft creation imports values with empty remarks.

On draft creation, evaluate safely interpretable imported results using the same established remark evaluator that manual entry uses. Display “From IPI Results” with source sheet/row, original value, and lookup time. Preserve raw source strings and fingerprints. Normalize only recognized result representations for evaluation; do not rewrite the raw source or reinterpret arbitrary qualifiers. An imported “Nmt 100” must not be converted into the manual “Nmt 10” action. Unknown text, ambiguous qualifiers, missing values, and invalid measurements stay marked for analyst review, never default to Passed.

Computed suggestions fill an unset remark and are identified as automatic. A user can choose Passed or Failed explicitly; that becomes a manual override and survives saves, reloads, method switching, and later result edits. A “Use automatic remark” action returns that row to automatic behavior. While automatic mode is active, a measurement edit recalculates the suggestion with the existing rules. Overall remarks continue to derive from final row remarks using the current equipment-specific failure wording.

For legacy drafts, treat any stored nonblank remark as an existing analyst decision; do not overwrite it. Compute suggestions for blank, safely interpretable rows without claiming a newly saved revision until the analyst saves.

Do not expand a single sheet test value across multiple equipment rows. Environmental import is enabled only if actual configured source columns/rows uniquely identify ML number, monitoring method, equipment point, and test. Until such a mapping is confirmed, environmental measurements remain manual and the UI states why. The implementation must inspect available source structure before adding such support; it must not invent an environmental tab or mapping. Refreshing a source cannot overwrite edited measurements or override manual remarks. Retain existing source-change checks at generation.

## 5. Interaction and motion

Every button on the Reports and Results route gets consistent pointer hover/press feedback, focus visibility, disabled state, and pending/completed feedback where applicable. Include increment/decrement, add/remove equipment, method switches, result toggles, remark choices, save, review, preview, download, and draft actions. Reuse scoped shared styles so unrelated routes do not acquire new effects.

- Press acknowledgment: approximately 100–150 ms with a slight physical compression and icon response.
- Selected equipment and method indicator: approximately 180 ms, interruptible and with no action delay.
- The authored focal moment: confirming equipment quantities produces a small, one-time vessel/row-count graphic beside the preview, showing the selected equipment becoming sampling points. It depicts setup, not measured results or laboratory approval.
- Save/preview buttons visibly transition to pending and then complete/error states; no decorative perpetual motion.
- Preserve the existing reduced-motion, motion-off, constrained-device, and hidden-page behavior. Reduced-motion feedback uses static color/text state instead of spatial movement. No page-load choreography, moving tables, or particles around result entry.

## 6. Work that must be reached

Inspect and extend the shared environmental selection/schema, resolver, criteria expansion, snapshot/session types, report-setup and draft endpoints, paired draft creation, report row generation, and DOCX worker rendering. Existing adaptive templates must represent every generated point and method parameter; incompatible fixed layouts block generation rather than truncate rows.

Extend draft import and remark initialization, save validation, manual-override provenance, and the editor. Reuse the current scientific evaluator and display helpers. Check the sample workbench and any other caller of report setup or draft creation so an environmental draft cannot bypass quantity validation.

Maintain backward compatibility for old profile/output-based drafts and non-surface environmental outputs. No bulk data migration, destructive replacement, new dependency, or new global equipment administration product is required for this change.

## 7. Verification and acceptance

- Equipment quantities generate deterministic, unique point identities and the same point list in both methods, while retaining distinct parameter sets and unchanged RLU/cfu/mL behavior.
- Exercise zero/empty, negative, decimal, excessive quantities, missing method coverage, conflicting criteria, label collisions, source revision changes, and template incompatibility through server validation.
- Verify paired draft creation remains atomic, saved snapshots survive reload, and legacy drafts retain their original rows and results.
- Verify direct imports receive correct automatic suggestions only for interpretable values, source strings remain intact, and manual overrides persist. Blank or ambiguous results cannot produce a pass.
- Regression checks cover existing threshold boundaries, Nmt formatting, overall remarks, SFG/FG/ST/MIS setup and reports, and non-surface environmental outputs.
- Generate both DOCX/PDF outputs from a de-identified quantity session and inspect the actual tables for all selected points, standards, and method units. Use worker checks where rendering changes.
- Run the appropriate unit/integration tests and build, then inspect and interact with the rendered application at desktop and mobile widths, in both themes, with keyboard navigation and reduced motion. Test unsaved edits, read-only access, pending/error/conflict states, and local table overflow.
- Run the Impeccable detector and a critique/audit; fix material findings before completion.

## Review status and delivery

This is a written design review, as requested. The optional browser mockup offer has not been answered, so this review uses the written layout example. The independent builder check returned “nothing important left.” Proposed delivery after design approval: write the implementation plan, build and verify the change, and deploy the verified result to the existing production service. The earlier bug-fix deployment is already complete.
