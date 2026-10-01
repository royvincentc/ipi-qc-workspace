# Environmental Monitoring Format Review Package

**Purpose:** owner review of report-family routing and product-specific grouped rows. This package is not a production template registration and does not change the controlled source file.

## Files

- `07-ENVI-tagged-style-candidate-copy.docx` — a byte-for-byte copy of the user-supplied tagged working document. The source at `C:\Users\Roy\Documents\ipi format\ENVI.docx` was not edited. The local renderer now supports grouped repeated rows and vertical merges for the registered 5-column and GIP families; the other distinct table adapters remain pending.
- `01-format-catalog.csv` — proposed reusable format families and evidence counts.
- `02-product-format-review.csv` — observed product/method pairs and a proposed route for owner confirmation.
- `03-candidate-sampling-plan-review.csv` — deduplicated historical locations/criteria from high-confidence archive matches, without historical result readings. These are evidence candidates only, not current approved plans.
- `04-archive-structure-evidence.csv` — report table signatures and representative archive paths for manual checking.
- `05-product-profile-schema.json` and `06-example-grouped-profile.json` — proposed data structure for product routing and group/row population.
- `08-renderer-adapter-specs.json` — table-cell bindings and grouped-repeat behavior proposed for each format family.
- `07-product-format-review.xlsx` — the same review data in workbook tabs for convenience.
- `09-google-sheet-read-only-crosscheck.md` — read-only cross-check of the linked logbook tab, its visible headings, the requested ML row, and a column-label gap that needs owner interpretation.
- `10-owner-provisional-decision.md` — records the owner's provisional acceptance of the recommendations, with the remaining controls needed before live use.

## Findings from this scan

- Scanned 3,630 DOCX entries from the supplied ZIP. 3,625 contained a table with a Results header recognizable by the structural scan.
- 3,603 standard five-column tables were found; 13 additional sparse two-row documents share the same five-column header family. Accupoint and SPC/MY are method/profile differences when the approved table topology is the same; they do not automatically need different DOCX files.
- The structural exceptions confirmed in this scan are: two four-column GIP reports, three four-column Water Treatment Validation reports, and three Warehouse 4 qualification reports with a two-level Active Air / Passive Air result header. Each needs its own format adapter if still in current use.
- One historical report has a misspelled `Standard Specifications` header. It is not treated as a new family based on a single typo.
- Earlier notes mentioned Open Plate Exposure as a three-column exception. This ZIP-wide structural scan did not confirm a three-column result-table signature, so it is not included as a format family here. Please identify a source report if Open Plate Exposure is still needed.
- The connected logbook lookup is now confirmed: `ML-EM-26-0488` is row 74 of `September(ENVI) 2026`. The October tab's cell title still reads “SEPTEMBER 2026”; see file 09.

## Manual review workflow

1. Treat the recommendations and product/method routes as provisionally accepted per `10-owner-provisional-decision.md`; revisions can be applied later.
2. Before a template is used for a released report, compare the generated output from the 5-column DOCX copy against the signed/controlled blank and screenshot.
3. Before live use, identify the approved blank master for every active GIP, water-validation, and warehouse format. The warehouse adapter is not implemented yet.
4. Before live use, reconcile archive-derived locations and criteria in `03-candidate-sampling-plan-review.csv` against the current controlled sampling plan. The provisional decision permits draft layout review, not silent acceptance of conflicting historic criteria.
5. Configure each sample to resolve to exactly one active profile to avoid the existing multiple-layout ambiguity error.

## Data and renderer limits

- The logbook row for `ML-EM-26-0488` records a monitored-equipment count, not individual locations. Product rows therefore come from a separately controlled sampling plan.
- Historical report readings, pass/fail remarks, analyst identities, dates, and signatures are not used as current-result defaults.
- The current app renderer can repeat rows from the `{{tests}}` prototype and vertically merge contiguous cells by configured group key. The current generation path requires per-row `test`, `location`, `criterion`, `value`, `remarks`, and `groupKey` data, and will block when a grouped profile has no controlled location rows.
- Local implementation is not deployment or registration. Product prefix routing and the fallback selector are admin-managed settings; unresolved/multiple matches block draft generation. Warehouse's 7-column phase/air layout is explicitly unsupported pending a dedicated adapter. Water validation and GIP require their correct blank master and owner review before registration.
- This DOCX was not rendered for visual QA in this environment. The included DOCX is a review copy, not evidence that the generated output visually matches the approved form.
