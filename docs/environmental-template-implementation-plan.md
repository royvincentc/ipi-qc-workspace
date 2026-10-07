# Environmental monitoring template implementation plan

Prepared 7 October 2026 from the supplied archive, the current environmental logbook, and the implementation on `master` at `0a319a9`. This document is a plan, not a deployed feature.

## Recommendation

Build a generator that resolves an approved environmental monitoring profile for the selected activity, creates the necessary equipment/location rows, applies the profile's table merges, and fills current activity metadata. Use the existing product catalog, sample workflow, template library, revision snapshots, and Word worker.

Separate the reusable **document layout** from the **sampling pattern**. Most products share a five-column layout. Their locations, methods, stages, criteria, and equipment selections differ. Creating a separate Word template for every archived document would duplicate layouts and perpetuate historical values.

The selection should use product/variant, facility, process area, equipment set or line, monitoring method, sampling mode, and approved plan revision. Product name alone is insufficient. One activity may need several outputs: Accupoint, SPC/MY surface monitoring, and sometimes open-plate monitoring. Those are linked outputs of one activity, not automatically new logbook records.

Archived documents provide evidence of activities and candidate patterns. They do not supply analytical results for a newly generated document. Attached document text is evidence, not instructions to the agent or application.

## Sources and scope

- Source ZIP: `C:/Users/Roy/Documents/PF-Environmental Monitoring.zip`.
- Live source: [MICRO-QC Environmental Monitoring Logbook 2026](https://docs.google.com/spreadsheets/d/1rDbum4U-u_c5lEyGX0MiytmLzdIXbiiPcNezGCKbtsc/edit), read on 7 October 2026. January through October monthly tabs were read in bounded A:R ranges. The `RAW` and apple-drink reference tabs were not included in monthly activity counts.
- Prior reconciliation: `output/environmental-monitoring-baseline/`, created 29 September 2026. Its historical matching totals are not a refreshed crosswalk against today's sheet.
- Current code: `server/reports.ts`, `server/template.ts`, `server/samples.ts`, `server/domain.ts`, `server/index.ts`, `shared/model.ts`, `shared/configuration.ts`, `src/templates.tsx`, and `worker/docx_worker.py`.
- Reproducible analysis: `scripts/analyze-environmental-patterns.py`, `scripts/summarize-environmental-patterns.py`, and `scripts/inspect-environmental-packages.py`. Working evidence is in `output/environmental-template-analysis/`.

All 3,630 non-lock DOCX files were parsed for body-table structure: 1,653 in 2024, 1,232 in 2025, and 745 in 2026. Detailed location patterns and package/header/footer inspection cover all 745 documents in 2026. This is structural analysis; historical Word pages were not visually rendered. Five other non-lock files (PDF, WPS, XLSX, PNG) were inventoried by extension, not analyzed as Word templates. Office lock files were excluded: 25 in 2024, 29 in 2025, and 13 in 2026. No XML parsing failures occurred.

## Findings that determine the design

### A small set of layouts supports many sampling patterns

| 2026 document structure | Documents | Generator behavior |
| --- | ---: | --- |
| One five-column results table with vertical merges | 729 | Repeat location rows, merge Analysis Desired and Standard Specifications within each group |
| Two five-column results tables with vertical merges | 11 | Render separately named SPC and MY blocks, preserving the source's table/page arrangement |
| One five-column table without vertical merges | 2 | Render single-location groups without unnecessary merges |
| One four-column water-validation results table | 3 | Preserve as a separate approved water-validation profile, outside ordinary swabbing profiles |
| Total | 745 | |

Five-column headers are Analysis Desired, Area, Standard Specifications, Results, Remarks. Merges usually occur in logical columns 0 and 2. Results and Remarks remain individual cells for every location.

The 11 two-table documents include three apple-drink peeling documents and eight Omega Export weighing documents. An apple-drink example contains 27 SPC rows and 27 MY rows. An Omega Export weighing example contains 22 rows in each table. These are observed patterns, not fixed counts for every future activity.

2024/2025 add uncommon structures: a six-column grid, four-column grouped reports, a seven-column warehouse/phase/air layout, and five documents without a detected standard result header. Keep them outside the first automatic rollout until an adapter and approved profile exist. The application already explicitly rejects the warehouse adapter as unimplemented.

### Product folders do not identify one sampling plan

| Archive product folder | 2026 documents | Observed result rows per document | Observed distinct locations per document |
| --- | ---: | ---: | ---: |
| Cheers Baby Oil | 98 | 1–8 | 1–4 |
| Dr. Wong's Apple Fruit Juice | 30 | 3–54 | 3–27 |
| Dr. Wong's Lightening Face Cream | 40 | 4–10 | 3–5 |
| Dr. Wong's Lightening Lotion | 51 | 4–10 | 3–5 |
| Efficascent Boost Pain Relief Massage Roll On | 155 | 5–16 | 3–10 |
| Herbycin Cooling Mouth Spray | 33 | 2–26 | 2–13 |
| Herbycin Nature's Leaf | 2 | 2–4 | 2 |
| Herbycin Syrup | 160 | 2–22 | 2–11 |
| Mama's Love Baby Oil | 107 | 2–8 | 2–4 |
| Omega Pain Killer Liniment - Export | 65 | 4–44 | 4–22 |

Four additional documents are at the 2026 archive root: one Herbycin filling document and three water-validation documents. Root filenames must not become product identities, as the earlier baseline parser allowed.

Examples:

- Cheers Bouquet compounding uses Mixing Tank 2 and Spatula in a common pattern. Filling uses Holding Tank, Pipe, Filling Tank, and Nozzle. SPC/MY repeats the same locations under two separate test groups.
- Mama's Love compounding commonly uses Mixing Tank 3 and Spatula. Tank 2 and Tank 3 must retain distinct equipment identities.
- Efficascent Boost compounding commonly has eight locations. Otherwise similar patterns use Stainless Drum 1/2 or Stainless Drum 3/4. Equipment count alone cannot choose between them.
- Herbycin Syrup distinguishes filling, compounding tanks, compounding utensils, and weighing utensils. A single product prefix cannot select all these correctly.
- Omega Export separates filling, weighing, compounding tanks, and compounding utensils. Preserve the Export variant independently of other Omega variants.
- Open-plate documents use locations such as Area 1 Near Door, Area 2 Center, and Area 3 End. They are separate from equipment surface locations.

The extraction found 138 exact candidate signatures after excluding result values and remarks. This is a preliminary grouping by product folder, detected method/mode, ordered locations, criterion text, stage text, and table structure. Whitespace, incubation wording, incomplete rows, and historical equipment changes can split equivalent signatures. These are not 138 approved templates or plans.

Content-based classification provisionally identifies 361 Accupoint documents, 363 SPC/MY surface documents, and 21 SPC/MY open-plate documents. The three water-validation documents are included in the provisional surface bucket and need separate classification. Content and folder-based classifications differ in some cases; resolve conflicts during review rather than trusting a folder label.

### Live logbook data requires explicit missing-data and conflict handling

The live monthly tabs contain 511 ML-EM activity rows and 498 distinct ML numbers. Thirteen ML numbers each occur twice. Preserve spreadsheet ID, sheet ID, row, and fingerprint as the source identity. A matched ML number still needs corroborating batch, date, product, and area evidence.

The current source lacks received date on 16 rows, facility on 16, product on 16, area on 17, and batch on 22. Equipment count is blank on 59 rows, sampler count on 70, and plate count on 103. Blanks remain unknown, not zero.

Columns I, J, and K contain counts. They do not list the actual equipment sampled. A logged count of eight cannot establish which eight locations were used. Use a compatible approved plan and confirmed equipment selection to populate location names.

The logbook has no dedicated monitoring-method column. Nonzero sampler and plate counts can suggest applicable outputs but cannot definitively select a method or establish that every plan location was sampled. Treat those counts as consistency checks. An ambiguous activity requires a method or output selection.

Specific current conflicts demonstrate why selection must expose evidence:

- October row 10 is named `Dr. Wong's Lightening Lotion - Filling` but its Area cell is `Compounding`.
- October row 9 names face cream for filling, has Area `Compounding`, and has no equipment/sampler/plate counts.
- The October tab's banner still says September 2026. Resolve period from the actual tab/source record, not the copied banner.
- September and earlier headers use `RECIEVED BY`; October uses `RECEIVED BY`. Validate a reviewed header alias without changing column ownership.

These source discrepancies were observed, not edited. Product-name suffixes must not silently override contradictory source area values.

### Archive headers improve matching and reveal fields absent from the logbook

696 of the 745 documents contain an ML-EM reference in a Word header. Use explicit header metadata before filename guesses. Check product, batch, received date/time, facility/area, and process title for conflicts. The remaining 49 need stronger alternative evidence or review.

Headers contain fill volume, manufacture/expiry dates, batch size, requested-by, detailed area, temperature, and relative humidity in representative documents. The logbook's A:R activity record does not supply many of these fields. Historic header values must not carry forward into new templates. Add current activity inputs only for fields the approved format actually needs. The site's physical location and line cannot always be inferred from PF1/PF2 alone.

All 745 document packages contain drawing or picture elements. These can be logos, text boxes, or signatures; XML presence alone does not distinguish them. There are nine page-setting variants. Preserve approved branding/layout, inspect graphics, and remove historical sign-off content when preparing reusable templates. Distinguish static form revision/approval text from a historical activity approval.

Only 628 documents contain detected PAGE instructions and 602 contain detected NUMPAGES instructions. Detection does not establish correct rendered pagination. Repair missing automatic page fields in selected template candidates and verify in the target renderer.

230 documents have at least one dashed/empty specification cell after resolving vertical merge inheritance. Dashed criteria remain unresolved. Open-plate examples also disagree on `cfu` versus `cfu/mL`. Do not derive a universal threshold or unit from the most frequent historic wording.

Eight documents are additional byte-identical copies. Count distinct content when weighing pattern frequency, retain all source references, and avoid presenting copied documents as independent support.

## Current implementation and required changes

| Existing part | Reuse | Gap to address |
| --- | --- | --- |
| Managed Products and aliases | Canonical product identity and active state | Add approved variant/process aliases without collapsing equipment or Omega variants |
| Environmental sample mapping | A:R fields, facility, area, counts, source identity | Add supplemental activity inputs and selected plan/output context without changing existing source columns |
| Template library and routing | Registration, revisions, product selectors, fallback, grouped-row presets | Resolve a composite profile rather than longest product-prefix match alone |
| `prepare_template` | Existing OOXML package handling and field substitution | It assumes criterion/result/remarks at columns 1/2/3. Five-column environmental tables use Area at 1 and criterion/result/remarks at 2/3/4. Recognize logical columns and sanitize every location row, including continuation cells |
| `reportRows` | Location/stage/replicate identity and blank result handling | Expand approved plan locations into stable instances, preserve block order, and group by block/method/stage/criterion/unit |
| `docx_worker.render` | Styled row cloning, split-run token replacement, vertical merge support | Support named repeating blocks and logical-grid addressing; current renderer allows only one repeating block |
| Draft revision snapshots | Stable configuration/template snapshots and audit trail | Snapshot selected plan, profile, criteria, equipment and alias revisions; do not silently reroute an existing EM draft when settings change |
| Result lookup | Existing authorized product result source for supported categories | Generic lookup keys only by test ID and may repeat one SPC/MY value into all EM locations. Disable that path for EM until a separate detailed result source can identify every location/stage/replicate |

`templateAccepts()` currently always returns true. Introduce environmental compatibility validation before offering or generating a template: category, named blocks, column map, instance coverage, merge ranges, and required current fields. Do not allow the general cross-category template fallback to generate an EM report with an unrelated product layout.

Existing tests cover fixed bindings and basic Word generation, but no tests currently exercise environmental grouped merges or named multiple blocks. Add focused coverage rather than assuming the current merge implementation handles the archive.

## Explicit fix for ambiguous report layout selection

The reported failure is part of this plan's scope:

> More than one registered report layout matches this sample. Keep one active repeating-row layout for this category or configure a unique layout.

The screenshot identifies Efficascent Boost Pain Relief Massage Roll On, `ML-EM-26-0036`, batch `EYA07`, Environmental Monitoring, Regular, Filling. Its displayed RELEASED status and PASSED source note do not determine a report format or supply analytical results.

In the inspected code, this exact message is thrown by `resolveReportSetup()` when its final template choice contains multiple candidates. `templateAccepts()` accepts every layout, and the general fallback can consider templates from other categories when no category layout exists. The current EM router normally selects one route or emits a more specific environmental error before reaching this generic error. Therefore the screenshot alone does not prove that two EM templates are the cause. It could reflect a different deployed build, a source/configuration category mismatch, or an empty EM template set that triggers the cross-category fallback. Confirm the deployed code and actual registered routes before selecting a remediation.

Implement this as a focused routing fix before the larger pattern-generation rollout:

1. **Diagnose the actual failing activity.** Inspect its internal category ID and configured sample type, source identity, managed product match, deployed build ID, and registered template metadata. Record candidate IDs/names/revisions and why each candidate was included or excluded. Reproduce `ML-EM-26-0036` against that verified configuration. Do not assume the displayed category label establishes its internal ID.
2. **Keep category ownership explicit.** Match the configured environmental sample type to compatible environmental layouts. Remove cross-category fallback for environmental activities. If no compatible template exists, return a missing environmental template state with an actionable configuration link.
3. **Resolve one template per requested output.** Use an approved pinned profile/template revision first, then a unique compatible explicit route for product/variant, facility, area, method/mode and equipment selection. Use a declared environmental default only when it can represent that output. Distinct Accupoint, surface SPC/MY and open-plate outputs are legitimate separate choices, not competing templates for one unspecified report.
4. **Enforce compatibility before counting candidates.** Reject layouts that cannot represent the selected output's locations, blocks, criteria, stages or merge structure. Repeating rows alone do not establish compatibility. A matching product prefix must not defeat method or area validation.
5. **Handle genuine ties specifically.** If two compatible templates compete for the same output and precedence, return their names, the conflicting routing dimensions, and the configuration action needed. Never choose the first database row, longest name, or newest upload as an arbitrary tie-breaker. Missing method/equipment selections should request that specific selection rather than instructing the user to remove valid category templates.
6. **Preserve product parameters when layout selection fails.** Separate resolved product/specification data from layout resolution in the workflow response. The screenshot's `Parameters unavailable` panel currently reports a layout failure. When applicable criteria resolve successfully, keep them visible and show the layout issue at report selection/generation. Preserve true specification failures separately. A preview in this state does not authorize draft creation or report generation.
7. **Prevent recurring conflicts.** Add template active/superseded state and validated profile references. Before publishing a route, check whether it overlaps another active route for the same output and precedence. Inventory legacy templates and propose route assignments or retirement for review; retain their files and existing draft snapshots. Do not require one template for the entire EM category.
8. **Use the same resolver everywhere.** Workflow preview, automatic/manual draft creation, and generation must use the same output resolution. Persist the selected template/profile revision in a draft and retain it on save. A later settings change must not silently choose a different layout.

Acceptance for the screenshot case: with an approved Efficascent Filling profile and a confirmed output method, the activity resolves exactly one compatible template for that output and exposes its product parameters. If method, equipment, profile or routing is unresolved, the app identifies that specific missing choice or conflict. Merely registering other environmental formats must not reproduce the generic error.

The larger composite-profile design addresses the underlying ambiguity, but the fix is not complete until this focused resolver change and its regression checks are implemented. Editing this plan does not change the deployed application.

## Proposed model

Add versioned environmental records, initially as JSON-backed database tables following the project's existing persistence pattern:

1. **Evidence document:** content hash, archive path, source year, parsed header/body evidence, logical table grid, merge topology, and unresolved/conflicting fields. Retain source location (part, table, row, grid column).
2. **Sampling plan:** canonical product and variant, facility, process/subprocess, equipment set/line, sampling mode, ordered locations, required methods/stages/replicates, effective dates, revision, status, and supporting evidence references.
3. **Report profile:** plan reference, output method(s), approved template revision, named block definitions, semantic column map, field mappings, grouping/merge policy, and approved criterion references.
4. **Activity selection:** controlled sample/source identity, confirmed equipment selection, selected plan/profile revisions, required current inputs, and resolution evidence or explicit reviewer decision.

Reuse Criteria and Results where possible. Give generated EM instances a stable identity that includes output/block, method/test, location ID, stage, and replicate. A rendered row number is an address, not a data identity. Extend `resultKey` carefully for EM while preserving existing keys for other categories and old drafts.

The sampling plan describes what should be sampled. The activity selection describes what was actually confirmed for the current activity. A plan never asserts that an unrecorded swab happened. Permit a blank planned worksheet where useful, clearly distinct from populated activity evidence and a completed analytical report.

Candidate discovery is automatic. Promotion of product aliases, criteria, sampling plans, and reusable templates follows the existing reviewed configuration workflow. After a compatible profile is approved, future unambiguous activities can generate automatically without repeating configuration review.

## Resolution and generation flow

1. Load the selected controlled activity using the existing sample workflow and source identity.
2. Resolve canonical product and preserved variant through approved catalog aliases.
3. Read facility, area, category, secondary category, batch and current activity metadata. Surface missing values and contradictions.
4. Resolve active/effective plan candidates using the composite key. Select automatically only when one compatible plan remains. Where source data cannot distinguish equipment sets or methods, require those missing current selections.
5. Resolve one or more report outputs from the selected profile, such as Accupoint and SPC/MY. Display why each output was selected.
6. Expand the approved ordered locations and stages into per-location instances. Preserve confirmed unsampled/not-tested states separately from blank not-entered values.
7. Populate identity and current activity fields. Populate criteria only from approved references. Keep result values, Passed/Failed remarks, signature/approval dates, and current release status blank unless separately and explicitly supplied from an authorized source or entered in the current workflow.
8. Produce a deterministic render plan with named blocks, row values, and explicit merge groups. Validate full instance coverage and group consistency before calling the Word worker.
9. Generate DOCX and the existing preview format. Snapshot all revisions and source fingerprints so reopening a draft reproduces its selected pattern.

Leave uncertain archive links in review/unmatched states. Use only high-confidence links for automatic activity population under the agreement already in place. The existing 29 September score-based crosswalk must be refreshed and validated with header ML/date/area evidence before it is used for today's records.

Do not use ZIP modification times as sampling dates. Correct the earlier baseline's provenance hash (currently path plus timestamp, not document bytes) and batch extraction (currently limited to month letters A–I) when replacing its importer. These changes must not retroactively promote matches without comparison/review.

## How cells will merge and populate

For a five-column SPC/MY output with four confirmed locations, generate four SPC rows followed by four MY rows. Merge the Analysis Desired cells within the SPC group and separately within the MY group. Apply the same independent merges to Standard Specifications. Area, Results, and Remarks remain eight separately addressable rows.

For an Accupoint output over those four locations, create one four-row test group. A one-location group stays unmerged. Separate outputs never share a merge group.

The merge identity should include block, method/test, stage, approved criterion revision/text, and unit. Do not merge identical-looking criteria across different methods, stages, or blocks. Verify every cell being merged has compatible content before continuation-cell content is cleared. Never merge result values or per-location remarks to make the table smaller.

Use OOXML logical grid positions, respecting `gridSpan`, vertical merges, and row offsets. Raw `<w:tc>` index alone is unsafe for uncommon grids. Repeated prototype rows must have their prior merge instructions removed before new restart/continue instructions are added.

Named blocks could use markers such as `{{rows.spc}}`, `{{rows.my}}`, and `{{rows.accupoint}}`, with a manifest mapping marker to its payload. Retain the existing `{{tests}}` path for previously registered templates. Insert each block's observations exactly once and reject missing, duplicate, or unknown blocks.

Preserve widths, cell styles, approved header/footer layout, and appropriate page/section breaks. Keep header rows repeating over page boundaries. Validate long tables in Word/PDF; do not shrink text to force 54 rows onto one page.

## Implementation sequence

### Phase 0 Fix current layout ambiguity

- Reproduce the screenshot case using verified deployed code, source category and template configuration.
- Implement category-safe compatibility filtering and deterministic per-output resolution, with explicit missing/ambiguous states.
- Keep resolved product criteria visible when only template selection fails.
- Add regressions for multiple valid EM templates, no EM template with unrelated product templates present, a genuine same-output route tie, and source category-ID mismatches.

Exit condition: `ML-EM-26-0036` resolves the approved Filling output or shows the exact required selection/configuration fix; unrelated templates do not hide its resolved product parameters.

### Phase 1 Evidence and candidate review

- Extend the existing archive importer with paragraph-aware text, header/footer metadata, logical-grid and merge inheritance, source-content hashing, and clear exception records.
- Group candidate layouts separately from location patterns. Normalize formatting cautiously while retaining original evidence. Report method/title/folder conflicts and criteria differences.
- Reconcile against a fresh source snapshot using explicit header ML references plus batch/date/product/area corroboration. Preserve duplicate ML source identities.
- Produce candidate plan/profile records without changing live logbook cells or importing results.

Exit condition: every 2026 DOCX has a traceable classification or review exception; two-table documents and root water files are explicitly handled; candidate criteria are not treated as approved defaults.

### Phase 2 Approved plan and profile storage

- Add schema validation, migrations, immutable revisions, and draft snapshots for environmental plans/profiles/activity selections.
- Reuse the existing Products, Specifications, and Standardized Templates screens for alias, criterion and template review. Extend those components rather than adding a separate generic template builder.
- Define explicit approval/effective-date rules. An activity date may choose among approved revisions; missing dates cannot silently select an arbitrary historical revision.
- Introduce a pure resolver that reports resolved/review/missing/unsupported states and supporting evidence.

Exit condition: a product with distinct filling/compounding and multiple equipment sets can resolve a unique compatible profile or show the exact missing selection.

### Phase 3 Environmental template preparation and rendering

- Correct semantic result-column recognition and sanitize all mapped rows, headers, footers, text boxes, document properties and sign-off regions in candidate copies.
- Keep the ML identifier as its own field. Preserve the prior removal of the Logbook/page-reference field.
- Add named repeating blocks, logical column maps, explicit grouping validation, and safe merge reset/rebuild.
- Enforce EM template compatibility at registration and generation. Preserve old non-EM template behavior.

Exit condition: representative one-location, ordinary grouped, open-plate and two-table outputs have correct blank/current cells, merges and rendered pagination.

### Phase 4 Integrate with sample generation and the existing worksheet

- Extend report setup and workflow preview to return the selected environmental plan, required outputs, missing current fields, and ordered instances.
- Reuse the sample-generation/review flow: choosing the product and activity context proposes the applicable profile; confirmed fields drive generation.
- Add only necessary method/equipment/line selectors when source data cannot establish them. Show the chosen pattern, output methods and location count before generation.
- Disable generic per-test result prefilling for EM. Permit detailed result import later only with an explicit instance-level source contract and authorization.
- Support linked drafts for multiple method outputs without allocating multiple ML records for one activity.

Exit condition: an ordinary unambiguous activity produces the right template(s), current metadata and location rows; a conflicting October record cannot silently choose the wrong area.

### Phase 5 Verification and rollout

- Start with Cheers/Mama's Love and Efficascent single-table profiles to prove shared-layout reuse, distinct tank identities, and equipment selection.
- Include a small approved multi-table pilot for Omega Export weighing and apple-drink peeling before expanding coverage. Keep unsupported warehouse and unresolved water-validation profiles visible as unavailable.
- Render and inspect output DOCX/PDF in the target deployment's available renderer. The earlier local npm launch failure is a separate tooling issue to resolve before live UI checks.
- Follow AGENTS.md for frontend changes: inspect the existing UI, use applicable installed design guidance, start the dev server, interact through Playwright at desktop/mobile widths, inspect overflow and error states, and run an Impeccable critique after substantial changes. Fix significant findings.
- Retain feature/version control and rollback to existing approved templates. Existing drafts retain their snapshots unless the user explicitly migrates them.

Exit condition: structural tests and rendered/UI verification pass, approved profile coverage is listed, and unsupported/review cases fail with a specific explanation.

## Required tests and acceptance checks

| Case | Expected behavior |
| --- | --- |
| Screenshot: Efficascent `ML-EM-26-0036`, `EYA07`, Regular, Filling | One compatible layout per confirmed method/output; precise missing-selection state if needed |
| Several valid EM layouts for different products/areas/methods | Coexist without a category-wide ambiguity error |
| No compatible EM layout, with FG/ST templates registered | Missing environmental layout state; no cross-category fallback |
| Two equally eligible layouts for the same output | Named routing conflict; no arbitrary first/latest selection |
| Resolved criteria with unresolved layout | Product parameters stay visible; report generation remains unavailable |
| Displayed EM label with a mismatched internal category ID | Explicit mapping issue; no silent routing to another category |
| Cheers filling, four confirmed locations | Four Accupoint rows or eight SPC/MY rows as selected; merge only label/criterion cells |
| Cheers single-location compounding | One row per required test, no unnecessary merge |
| Mama's Love tank 3 versus Cheers tank 2 | Equipment identities remain distinct |
| Efficascent eight locations with two possible drum sets | Explicit equipment selection; no choice based only on count |
| Open plate versus surface SPC/MY | Separate mode, locations, approved units and criteria |
| Omega Export weighing | Two blocks of 22 rows in the representative fixture; no row duplication or cross-table merge |
| Apple-drink peeling | Representative 27 SPC + 27 MY rows; correct multi-page layout |
| Repeated test across locations | One stable instance per location/stage/replicate; no copying one sheet value into every location |
| Blank, zero, not tested | Blank stays blank, zero stays zero, not-tested retains its reason |
| Dashed/missing criteria | Review state; no automatic invented threshold or unit |
| Duplicate ML number | Source row identity and corroborating metadata determine the link |
| Name/area conflict or missing method | Resolve missing selection before automatic population |
| Multiple or noncontiguous merge groups | Explicit deterministic ordering or descriptive rejection; no silent data loss |
| Archived fields/sign-offs | No historical values, Passed/Failed remarks, release dates, approvals or signatures survive sanitization |
| Missing pagination fields | Candidate repaired and visually verified before use |
| Later plan/template revision | Existing draft snapshot remains reproducible |
| Existing product reports | Product Stability label, Omega New/Pro/Old distinctions, organism labels and prior report-field changes remain intact |

Unit tests belong around the pure resolver and instance expansion, `reportRows`, and Word merge/block preparation. Integration tests should exercise draft snapshots and category compatibility. Render checks must cover short and long representative outputs. TypeScript compilation alone does not establish template correctness.

## Decisions to resolve during profile approval

The plan proceeds with blank result generation, approved sampling patterns, and separate linked method outputs. Actual rollout still needs approved choices for equipment sets, whether each profile requires surface/open-plate outputs, current criterion sources/units, required environmental header fields, and how confirmable sampling timestamps differ from received timestamps.

These are configuration decisions grounded in reviewed evidence. They do not prevent building the importer, model, resolver, named-block renderer, or review workflow. Until supplied, affected profiles remain candidates and future activities cannot silently inherit historical decisions.

## Work completed for this request

Analyzed archive structure and 2026 location patterns; inspected 2026 headers/footers/packages; read the current monthly logbook; inspected the current generation code; saved reproducible analysis scripts and this implementation plan. No application behavior, live sheet, approved configuration, or deployment was changed. Existing unrelated files were left untouched; nothing was staged or committed.
