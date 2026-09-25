# IPI QC Microbiology Workspace — Strict Project Rules

| Document control | Value |
|---|---|
| Document ID | IPI-AI-RULES |
| Revision | 1.0 |
| Effective date | 2026-09-25 |
| Change authority | The project owner must explicitly authorize material rule changes |

These rules apply to every person or AI agent changing this project. Read [goal.md](goal.md) first. Log work in [tasks.md](tasks.md), audit inherited work with [audit.md](audit.md), and leave current state in [handover.md](handover.md).

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** express priority. A rule conflict or scientifically meaningful ambiguity must be documented and raised to the project owner or authorized IPI subject-matter owner; it must not be silently resolved by an AI.

## 1. Truth and scientific data integrity

1. The application MUST NOT invent, predict, copy, normalize, round, reinterpret, or silently correct an actual laboratory result.
2. Actual results MUST originate from an attributable manual entry or an explicitly authorized, validated instrument interface added in the future.
3. Historical completed reports MUST NOT prefill current results, dates, pass/fail remarks, analysts, reviewers, approvers, or signatures.
4. Applicable tests, acceptance criteria, actual results, and report layout MUST remain separate concepts and records.
5. `Not entered`, `not tested`, numeric zero, below-detection qualifiers, and a negative microbiological finding MUST remain distinguishable. `Not tested` requires a reason when allowed.
6. The UI MUST NOT display fabricated operational metrics, schedules, due dates, progress, notifications, or recent activity as real. Fixtures and demonstrations MUST be clearly and persistently labeled.
7. The system MUST NOT automatically release a sample. The current release MUST NOT calculate or populate an automatic pass/fail conclusion.
8. A source value MUST be preserved as received. Corrections create an attributable revision with the prior value, new value, reason, user, and timestamp; they do not erase history.

## 2. ALCOA+ implementation

The implementation must support the following data-integrity properties:

| Principle | Required system behavior |
|---|---|
| Attributable | Use unique authenticated identities; record who created, changed, reviewed, imported, or generated each record. Shared user accounts are prohibited. |
| Legible | Store readable values, units, qualifiers, reasons, and human-readable audit actions; exported records remain understandable through retention. |
| Contemporaneous | Capture server timestamps when actions occur; retain source timestamps separately; prohibit silent backdating. |
| Original | Preserve source snapshots, spreadsheet locations, document provenance, and file hashes so the first captured record can be identified. |
| Accurate | Validate types, ranges where scientifically authorized, units, required fields, mappings, and write-readback; never hide uncertainty. |
| Complete | Retain successful, failed, cancelled, repeated, corrected, and not-tested states plus all relevant metadata and revisions. |
| Consistent | Use ordered timestamps, stable identifiers, controlled formats, versioned configuration, and deterministic numbering rules. |
| Enduring | Store records and audit history in managed persistent systems with tested backup, restore, retention, and migration procedures. |
| Available | Keep authorized records searchable and exportable throughout their retention period, including the configuration and provenance needed to understand them. |

These controls support audit readiness. IPI Quality/Regulatory owns the intended-use assessment, validation strategy, record-retention schedule, SOPs, training, periodic review, and any conclusion about FDA or Part 11 applicability/compliance.

## 3. Audit trail and electronic records

1. Material create, edit, status, configuration, permission, import, generation, download, and reconciliation actions MUST produce an append-only audit event.
2. Audit events MUST include event ID, server time, attributable user/service, action, record type/ID, prior and new values or a safe diff, reason where required, and request/submission correlation ID.
3. Normal application roles MUST NOT be able to edit or delete audit events. Audit access itself SHOULD be logged.
4. Application and database clocks MUST be synchronized. Displayed timezone and stored timestamp semantics MUST be explicit.
5. Finalized records MUST pin the precise sample/source snapshot, specification revision, template revision, result revision, and generation metadata.
6. Electronic signatures and fully electronic approval MUST NOT be represented as implemented until separately designed, validated, and authorized.
7. Retention, backup, disaster recovery, restoration testing, access reviews, and record export MUST be documented before production use.

## 4. Google Sheets source rules

1. The six Incoming sections are independent tables. Code MUST NOT read or write a monthly worksheet as one top-down table.
2. The controlled baseline is:

   | Category | Range | ML | Header/data |
   |---|---:|---:|---:|
   | Semi-Finished Goods | A:M | F | 5 / 6 |
   | Finished Goods | O:AA | T | 5 / 6 |
   | Water | AD:AN | AG | 5 / 6 |
   | Raw Material | AP:AZ | AS | 5 / 6 |
   | Stability | BB:BM | BF | 5 / 6 |
   | Miscellaneous | BO:BY | BR | 5 / 6 |
   | Environmental Monitoring | A:R | C | 4 / 5 |

3. Before every import or write, the server MUST validate spreadsheet identity, current-month tab, merged/section headers, field headers, boundaries, and the active mapping revision. A mismatch blocks only the affected operation and creates a review issue.
4. New samples MUST be written only to the current laboratory month determined on the server with the configured timezone, default `Asia/Manila`. A manually entered earlier receipt date does not authorize writing to a prior month.
5. New entries MUST continue after the last occupied or explicitly reserved row in the current category section. Earlier gaps MUST remain untouched.
6. An ML-only row is an unoccupied placeholder unless the existing Remarks cell contains exact text `RESERVED`. A partially completed row is unavailable. Color alone is not a reservation and requires reconciliation before live writes.
7. A destination placeholder MAY be reused only when it matches the valid next ML number; otherwise numbering is blocked for review.
8. Sequences are category-specific and reset annually. Used numbers derive from occupied records, explicit reservations, and pending application submissions, not the largest prefilled ML cell.
9. Allocation and writes MUST be serialized per workbook, use persistent idempotency/submission IDs, re-read destination cells immediately before writing, change only the intended section, and verify by readback.
10. Missing tabs, ambiguous sequences, unexpected headings, or moved records MUST NOT cause fallback writes elsewhere.
11. Initial live use MUST be read-only until reconciliation is complete and write access is explicitly enabled through controlled configuration.

## 5. Specifications and criteria

1. The specifications spreadsheet establishes test applicability only to the extent its reviewed columns say so. True/False values are not results and are not automatically numerical limits.
2. Candidate criteria extracted from historical reports MUST retain product/context, test, criterion text, unit, method/stage, source document, exact source location, source hash, report date, and date basis.
3. Where historical evidence conflicts, select the latest dated report matching product, test, and relevant context, using explicit release date when available and otherwise explicit analysis date. File modification time and filename are not authority dates.
4. Missing dates, conflicting dates, equally dated disagreement, missing criteria, or ambiguous product/context matches MUST remain unresolved until an authorized human decides.
5. Specification edits create a new immutable revision. They MUST NOT rewrite finalized historical records or silently update an open draft that already pinned a revision.

## 6. Reports and files

1. A report template MUST come from a designated approved reference. `james.zip` documents remain historical evidence until formally designated.
2. Original evidence files MUST remain unchanged. Create templates from controlled copies and record their hashes and revisions.
3. Preserve approved page setup, fonts, spacing, table sizes, borders, headers, footers, document-control identifiers, labels, row order, repeated structures, and signature areas.
4. Remove historical variable data from templates. Populate only mapped fields from the selected sample and current manual-result revision.
5. Parameter labels MUST omit `after ## hrs incubation`.
6. The controlled “Noted by” value is `Celeste P. Yandug — Assistant Head, Microbiology Laboratory` until explicitly revised.
7. Use automatic continuous `Page X of Y` fields. Keep the distinct logbook/page reference editable.
8. Report download MUST be blocked when required fields, criteria, context, or mappings are unresolved. Saving an incomplete draft remains allowed.
9. Every supported layout MUST pass rendered visual comparison, including long text, variable rows, page breaks, headers/footers, and pagination. A DOCX that merely opens is not sufficient proof.
10. File search, preview, and download MUST enforce authorization server-side and SHOULD log access to controlled records.

## 7. Authentication, authorization, privacy, and secrets

1. Company records MUST require authenticated, allowlisted access. Server endpoints and file downloads enforce authorization; hiding a UI action is insufficient.
2. Use least-privilege roles. Initial role intent is Administrator, Analyst, Reviewer when activated, and Read-only/Viewer. Permissions remain code-protected security policy even when assignments are configurable.
3. Google service-account keys, OAuth secrets, database credentials, tokens, and private links MUST remain in approved server-side secret storage. Never commit, log, display, or place them in ordinary settings fields.
4. Connection Settings store shareable resource identifiers/links and safe status metadata. Saving a link never changes Google sharing permissions.
5. Development and screenshots MUST use de-identified data unless live IPI data is explicitly authorized for the exact activity.
6. Errors shown to normal users MUST be actionable and must not expose stack traces, SQL, filesystem paths, secrets, or internal security details.

## 8. Configuration and historical integrity

1. Business configuration that authorized laboratory staff reasonably maintain SHOULD live in the validated configuration store: sample types, controlled fields, products/materials, tests, specification versions, lookups, safe numbering parameters, report metadata, and supported appearance preferences.
2. Fundamental security states, audit rules, data-integrity invariants, and unsupported workflow combinations MUST remain protected in code and validation.
3. The configuration service is the single authoritative application interface. Do not duplicate managed values in unrelated TypeScript arrays, report code, spreadsheet code, and UI code.
4. Configuration payloads MUST be typed, schema-validated, referentially valid, revisioned, attributable, and rejected atomically when invalid.
5. Referenced configuration is deactivated/archived or superseded; it is not hard-deleted. Historical snapshots remain resolvable.
6. Changes to number formats MUST include collision analysis and preview. A configuration that could generate duplicate control numbers MUST be rejected.

## 9. Change and coding controls

1. Inspect the repository, data model, migrations, current diff, and relevant tests before a broad refactor. Do not trust a prior agent’s completion statement without evidence.
2. Preserve existing identifiers and records. Use reviewed, reversible migrations; back up production data; verify forward migration, backward compatibility, and restoration.
3. Never discard another agent’s or user’s uncommitted work. Identify ownership and intent before resolving overlap.
4. Every material change MUST be recorded in `tasks.md`; every stopping point MUST update `handover.md`.
5. Keep commits focused and human-readable. Do not mix unrelated cleanup with a regulated workflow change.
6. Test the behavior affected by the change. At minimum, relevant typecheck, unit/domain tests, production build, server/API tests, document-worker tests, and representative browser/report checks must pass before claiming completion.
7. Live source tests default to read-only. A test that writes company records requires explicit authorization, a controlled test record, prevalidated destination, and a documented cleanup/reconciliation plan.
8. Do not claim a test was run, a defect fixed, or a workflow complete without retaining reproducible evidence.

## 10. 6S project discipline

This is the project’s engineering interpretation of 6S and does not replace a laboratory SOP.

- **Sort:** flag obsolete handoffs, dead code, duplicated configuration, unsupported fixtures, and unused artifacts; remove them only after impact review.
- **Set in order:** keep one authoritative configuration path, predictable project structure, explicit owners, searchable logs, and named source mappings.
- **Shine:** leave code, tests, documentation, generated output, and repositories clean; keep secrets and temporary files out of source control.
- **Standardize:** use repeatable checklists, naming, audit events, validation commands, document-control fields, and handover formats.
- **Sustain:** update the ledger and handover continuously, perform periodic access/configuration reviews, and resolve drift rather than normalizing it.
- **Safety:** protect people, records, privacy, scientific meaning, and recoverability; stop ambiguous or structurally unsafe writes.

## 11. Regulatory basis and limitation

These rules are informed by official sources, including FDA’s [Data Integrity and Compliance With Drug CGMP Questions and Answers](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/data-integrity-and-compliance-drug-cgmp-questions-and-answers), [21 CFR Part 11](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11), the closed-system controls in [21 CFR 11.10](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11/section-11.10), and laboratory-record requirements in [21 CFR 211.194](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-211/subpart-J/section-211.194). Applicability depends on IPI’s products, regulated activities, intended use, and record decisions. Agents must use current official sources for regulatory changes and must not provide or imply legal certification.
