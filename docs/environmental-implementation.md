# Environmental report generation

Implemented locally on `master`, 7–8 October 2026. Production deployment and operational pattern approvals have not been performed.

The four owner-revised DOCX layouts are retained in `output/environmental-automation-review/*-prepared.docx`. They were validated and registered in the isolated local demo as the "Roy revised" templates; the prior five-column template was retired there. Their added analyst, logbook/page and standing-signatory fields are preserved. Demo registrations are database state and are not installed by this Git commit. Import these revised layouts through the administrator workflow for another workspace. Warehouse criteria/units and ambiguous organism mappings still need confirmation before pattern publication.

## Administrator workflow

1. Open **Settings → Report templates**. Inspect a representative environmental DOCX. Preparation supports grouped five-column, GIP four-column, water-validation four-column and warehouse phase/air seven-column tables. Select the preparation format explicitly when the evidence is ambiguous. The original file remains unchanged.
2. Prepare and download the blank copy. Review it in Word before registering it. Historical identifiers, results, passing remarks and signatures are removed from recognized regions. Unrecognized identifiers, tracked changes and unsupported layouts block registration. If you edit the downloaded copy in Word, select it under **Edited prepared DOCX (optional)** before registration. Keep the result-table placeholders; the original preparation retains its source and per-table merge settings. Recheck the sanitization declaration for the edited file. **Use original prepared copy** discards the upload selection. Registering a layout does not require a category-wide default or product prefix when an approved pattern will assign it directly.
3. In **Environmental sampling patterns**, analyze the inspected reference. The analyzer matches the report's ML number to the logbook and pre-fills product, facility, area, context, equipment count/location group, and effective start from that activity. If the product is missing, **Add detected product** creates it from the inspected name. Confirm the criterion date, add the output, and review every test, location, stage, replicate, criterion and unit.
4. Review the inferred pattern fields and source match, assign an approved layout to each output, then check the review declaration and publish. Effective-through stays blank by default. If no matching activity exists, available document fields and the report's received date are used; unresolved values remain blank for review. Add another reference/output for a different method or mode when needed.
5. In **Analysis reports**, select the current logbook activity. Choose its equipment set and monitoring output when more than one is eligible. Create a draft and enter independent current results at every location. Multiple outputs retain the same activity/ML number; creating a report does not log another sample.

Patterns and drafts pin their criteria and template revisions. Publishing a replacement retires the prior pattern for new selection; existing drafts keep their original snapshots. To cover another historical effective period for new drafts, publish a separate non-overlapping dated pattern instead of replacing it. Retiring a template stops new drafts while saved drafts retain their layout snapshot.

## Layout resolution and safeguards

- Environmental routing stays within the configured environmental sample type. Several layouts can coexist because each approved output assigns one layout explicitly.
- Legacy approved criteria/routes remain supported. The most specific compatible product prefix takes priority; equally eligible routes produce a named conflict. There is no cross-category environmental fallback.
- Criteria remain visible when a selected pattern's layout is retired, incompatible or changed. Creating a draft stays disabled until resolution succeeds.
- Missing facility/area/date, conflicting sample-name/area information, ambiguous equipment sets and unselected monitoring outputs require resolution. Equipment counts are not used as identities.
- Profile setup derives field suggestions from the inspected report and its exact ML-linked activity. The equipment label includes the activity's reported count and the table's distinct location names; it does not claim that a numeric count identifies a physical line.
- Accupoint is a numeric RLU test in the managed catalog. Surface, open-plate, water-validation, GIP and warehouse phase/air modes are distinct. Warehouse results require independent active/passive air channels, confirmed phase, criterion and unit. GIP supports organism findings as well as numeric tests. A Goods-in-Process source supplies layout evidence without reclassifying an activity as Environmental Monitoring.
- A five-column master can expand into independently named result tables. A paragraph separates tables so Word cannot combine them during save. Both warehouse heading rows repeat across pages; repeated observations paginate independently.
- Only analysis and specification cells may merge. Location, result and analyst-remark cells remain independent. Source layouts with unmerged rows remain unmerged. Named table blocks reject missing/duplicate blocks, incompatible merged content and noncontiguous groups.
- Generic IPI Results values are not copied across environmental locations. Current results, environmental conditions, overall passing remarks and release/approval dates are not inferred from historical reports.
- Environmental DOCX generation remains available if PDF rendering fails. The interface explains that preview is unavailable; configure Word or LibreOffice on the server and regenerate for a PDF. Review the document before operational use.

## Archive tools

`python scripts/export-environmental-candidates.py "C:/Users/Roy/Documents/PF-Environmental Monitoring.zip" --output output/environmental-candidates`

The exporter hashes actual archive/document bytes, preserves criteria and equipment differences, and emits review candidates without historical results. It processed 3,630 DOCX documents: 3,623 supported documents across the four families, seven explicit layout exceptions and 67 excluded lock files. It identified 575 candidates across 2024–2026; these are provisional structural/criterion signatures, not approved products or sampling plans. Product/path/mode hints need confirmation.

`scripts/prepare-environmental-review.py` prepares four sanitized review documents and unapproved setup proposals using the supplied five-column example and representative archive sources. `scripts/stage-environmental-review.py` stages references and prepared copies only in a local demo workspace. It does not register layouts, publish patterns or create samples. Review artifacts are in `output/environmental-automation-review/`; registration and form completion await owner layout review. Missing warehouse criteria/units and ambiguous organism labels remain approval blockers.

The existing reconciliation tool now reads header ML evidence, hashes file content, recognizes batch month letters A–L and treats root filenames as unresolved product identities. Automatic high-confidence links require unique corroborated product, batch and area evidence and agreeing header identifiers. Guessed name overlaps remain in review. Supply an optional `--aliases` JSON map only after the owner approves the names. These links describe activity, not laboratory results.

## Verification

- TypeScript compilation and production Vite build passed.
- 89 TypeScript tests and 19 Python tests cover routing, category compatibility, pinned snapshots, independent blank/zero results, safe merge rules, all four formats, warehouse channel pairing, multi-table preparation, footer repair, historical header cleanup and reconciliation.
- An isolated demo database passed browser inspection → template preparation/registration → pattern publication → draft creation → independent result entry/save. Equipment and output selections block draft creation until specified. Revision history opens and closes with Escape. DOCX download remains available when the sandbox cannot access Word COM.
- Browser checks at approximately 391 and 1,440 CSS pixels found no document-wide horizontal overflow in the final report flow. Pattern tables use a contained horizontal scroll region. Existing design tokens and controls are reused; the Impeccable detector returned no findings.
- Microsoft Word rendered short, unmerged, 22+22-row and 27+27-row source-layout checks. Long outputs span three pages with continuous numbering; tables preserve all rows and independent results. Blank sign-off areas remain on the last page. Dashed criteria in the peeling source are deliberately review-only and cannot become approved criteria.
- The four prepared review templates each render on one page. Generated checks preserve 16 grouped, 12 GIP, two water-validation and ten paired warehouse rows. The five-column master produces two independent 22-row tables across three pages after Word saves it. Current result cells stay blank in these layout checks.

Verification artifacts are in `output/environmental-implementation/` and are not production reports. Unrelated pre-existing files were left untouched. No operational Sheets/Drive writes or production configuration approvals were made.

## Rollout

Deploy the reviewed code using the normal project workflow; server startup creates the profiles table and adds the Accupoint capability when absent. Configure the available document renderer. Publish a small owner-reviewed product/area pilot, including an explicit two-table pattern, then expand coverage. Confirm source conflicts and missing criteria during approval. Unsupported layout exceptions remain unavailable until their adapter is implemented.
