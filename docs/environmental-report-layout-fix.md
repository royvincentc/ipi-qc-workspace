# Environmental report layout correction

8 October 2026.

Area placeholders in all four environmental layouts use `{{facility}} {{area}} Area ({{type}})`. Facility and area come from the draft's pinned Google logbook activity. Type is the parenthetical Area description from the selected pattern's source evidence; new imports retain it as `areaType`. Existing patterns resolve it from their criterion-source document identities. Conflicting descriptions stop generation rather than using a broad product guess.

Environmental release fields now use the generation timestamp in the configured laboratory timezone. This remains a document timestamp and does not release the source sample. A rendering contract revision prevents the old cached report from bypassing these fixes.

Environmental rendering merges contiguous test/specification groups even when a legacy block has an empty merge-column list. Location, result and remark cells remain independent. Distinct tests, criteria, stages, units and specification revisions cannot share a merged group. Five-column SPC/MY labels follow the supplied reference's concise labels; incubation stages still distinguish saved instances and merging groups.

Existing sanitized layouts receive the Area correction when rendering, including older pinned drafts. Preparation uses the same correction; layouts lacking an Area slot receive one without replacing Purpose. Original reference documents and saved result revisions are preserved.

Verification: 100 TypeScript tests, TypeScript compilation and 23 Python worker tests passed. Microsoft Word rendered the user's reference and regenerated ML-EM-26-0491 report as one page each. The corrected report retains all 16 saved observations and displays PF2 Compounding Area (Hair and Body Care), with release 10/08/2026 @ 11:23 AM. OOXML contains 16 vertical merge elements in each test/specification column and none in the location/result/remark columns. All four corrected blank layouts were rendered and inspected. The packaged document renderer could not find LibreOffice; the installed Word renderer and bundled PDFium rasterizer provided the visual checks.

Review copies are in `output/environmental-automation-review/layout-fix`. No source logbook, controlled ML number or laboratory result was changed.
