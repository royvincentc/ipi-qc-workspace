# Environmental report UI audit

## Bulk setup follow-up, 8 October 2026

Live-context follow-up: the local demo now holds 495 authenticated logbook snapshots and 28 active approved patterns with 43 outputs. The banner clearly identifies local snapshots and disabled Google writes. ML-EM-26-0491 was exercised in the report UI: available equipment-set choices appear, and the message now requests selection rather than incorrectly claiming a pattern still needs approval. Settled layouts at 391/1440 CSS pixels had no page overflow. Current results were not fabricated and no sample was appended to Google. All 97 TypeScript tests and 22 worker tests passed; the compiler passed.

Archive processing and the approval table were checked in the local demo with the supplied 3,630-document ZIP. The scan produced 299 grouped proposals and 64 document exceptions. Current live routing metadata is absent in this demo; nothing was published through the UI.

Browser interactions covered archive resumption, automatic selection of all four approved layouts after asynchronous loading, preparation, product filtering, criteria expansion, keyboard opening/closing, disabled publication and the unchanged-parameter date toggle. No date fields appear with unchanged parameters selected. Desktop (1,440 CSS pixels) and mobile (391 CSS pixels) had no document-wide horizontal overflow; the table scrolls within its container. All inspected controls had accessible names. Checkbox declarations now have separate rows and targets at least 44 pixels high.

Scoped audit: accessibility 3/4, performance 3/4, theming 4/4, responsive 3/4, integrity 4/4 (17/20). No unresolved blocking/major findings in the new bulk workflow. Full WCAG certification and physical-device touch testing were not performed. Large archives still require evidence review; product filtering narrows the table. Publication, new-product creation, stale-configuration rejection and interrupted-publication recovery are verified by isolated integration tests.

7–8 October 2026. Scoped to sampling-pattern approval, report setup and environmental result entry/review. Impeccable audit guidance applied with source inspection, detector and rendered browser checks. Operational data was not used to publish profiles; verification used an isolated demo.

| Dimension | Score / 4 | Evidence |
| --- | --- | --- |
| Accessibility | 3 | New controls use existing labelled Field controls and native buttons/selects. Result inputs had no missing accessible names. Revision dialog closes with Escape. Broad WCAG certification was not attempted. |
| Performance | 3 | No new dependencies, animations or remote calls per keystroke. Source analysis is explicit. Large row lists are limited to 300 per output; full-scale operational profiling remains unmeasured. |
| Theming | 4 | Existing typography, surface, control and status tokens are reused. No new hard-coded colors. |
| Responsive | 3 | Report flow checked at roughly 391/1440 CSS pixels without document-wide overflow. Wide review tables scroll within their container. |
| Implementation integrity | 4 | Scientific row tokens are excluded from editable report metadata. Missing layout does not hide resolved criteria. Equipment/output ambiguity blocks draft creation; no-result and PDF-unavailable states remain explicit. |

Health score: **17/20**. No unresolved P0/P1 UI findings within this scope. The bundled detector returned `[]` for the changed report/template/pattern components.

Fixed findings: internal `rows.*`/location tokens initially appeared as report-detail inputs; environmental copy initially implied automatic IPI Results imports; raw renderer errors initially blocked DOCX access; duplicate output IDs were possible after removing an output. Those issues were corrected and affected flows exercised again.

Remaining P2 limitation: very large multi-output approval tables require horizontal scrolling and extensive review. Use a small representative pilot before broad approval. Final polish and wider assistive-technology testing can follow the pilot.
