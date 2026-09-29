# Environmental monitoring baseline — 2026

Generated on 2026-09-29 from the supplied `PF- Environmental Monitoring.zip` archive and a read-only export of `MICRO-QC Environmental Monitoring Logbook 2026`.

## Purpose and grain

This baseline separates three different facts that must not be conflated:

| Dataset | Grain | What it represents |
| --- | --- | --- |
| `logbook-activity-rows.csv` | One valid `ML-EM` row in the environmental logbook | The controlled record that swabbing activity was logged. |
| `archive-document-manifest.csv` | One archived Word document | Evidence document, including its path, product/batch candidates, process area, method, timestamp, and provenance hash. |
| `archive-swabbing-activities.csv` | One individual location/equipment line in an evidence document | A swabbing activity at a specific equipment/location; **not** an analytical sample result. |

No readings, pass/fail fields, or document metadata have been written to the live Google Sheet. The live sheet was used read-only, and operational logging remains disabled.

## Reconciliation key and confidence

The event-level crosswalk uses the available archive and logbook evidence in this priority order:

1. Exact batch number
2. Product name or documented alias/token overlap
3. Process area (`Compounding`, `Filling`, or `Weighing`)
4. Method evidence (Accupoint sampler use)

`matched` means one high-scoring candidate was found. `review` means the archive evidence leaves more than one plausible controlled row. `unmatched` means no candidate was found. Do not promote a `review` or `unmatched` row into reporting facts without source review.

## Evidence profile

- 745 2026 DOCX evidence documents were parsed with zero parsing exceptions. Thirteen temporary Office lock documents were excluded.
- 6,921 individual swabbing-location activities were extracted: 2,317 Accupoint and 4,604 SPC/MY.
- The archive averages 9.29 swabbed locations per document. This is why archive activity count must never be used as a count of incoming sample/logbook rows.
- 501 valid environmental-logbook rows were identified (`ML-EM-*`). Of those, 267 have at least one provisional archive reference in the crosswalk.
- Event-level crosswalk status: 2,884 matched; 3,980 review; 57 unmatched.

## Data-quality findings to preserve

| Finding | Evidence | Reporting risk / action |
| --- | --- | --- |
| ML identifier is not unique in the 2026 export | 501 log rows, 488 distinct ML numbers (13 additional occurrences) | Preserve source row/tab references; do not deduplicate by ML number. |
| Required logbook metadata is incomplete on some valid ML rows | Missing: received date 16, facility 16, product 16, area 17, batch 22 | Exclude or flag these from time/facility/product trends until reconciled. |
| Operational counts are incomplete | Equipment 58 missing; Accupoint samplers 69 missing; plates 101 missing | Do not interpret blank as zero. |
| Status is often unresolved | 272 blank, 154 released, 71 on-going, 4 cancelled | Status-based completion/release metrics must state the unresolved population. |
| Product and facility vocabulary differs between sources | Archive uses product-family folders and method folders (`Accupoint`/`SPCMY`); logbook uses PF1/PF2 plus fuller product/process labels | Use the supplied crosswalk; do not join raw fields directly. |

## Files

- `baseline-summary.json` — counts, source identity, and high-level profile.
- `logbook-rows.json` — read-only source snapshot used for this baseline.
- `logbook-activity-rows.csv` — the 501 controlled logbook records.
- `archive-document-manifest.csv` — archive-document provenance.
- `archive-swabbing-activities.csv` — equipment/location activity evidence and its reconciliation status.
- `parse-exceptions.csv` — document parsing exceptions (empty for this run).

## Recommended reporting rule

For the current reporting baseline, use `logbook-activity-rows.csv` as the denominator/control population and only `reporting-high-confidence-activities.csv` as automatic archive evidence. `review` and `unmatched` entries remain outside reporting facts until reconciled. Aggregate equipment/location activity only after selecting a reporting definition (for example, activities per controlled logbook row, per batch, or per facility/process area).

`approved-alias-mapping-rules.csv` is deliberately empty except for headers. Add only reviewed, authorized aliases or mapping rules there; do not infer and bulk-apply them from this archive.
