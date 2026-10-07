# Environmental report UI audit

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
