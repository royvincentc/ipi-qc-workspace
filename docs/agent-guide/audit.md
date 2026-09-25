# IPI QC Microbiology Workspace — Independent Agent Audit

| Document control | Value |
|---|---|
| Document ID | IPI-AI-AUDIT |
| Revision | 1.0 |
| Effective date | 2026-09-25 |
| Purpose | Verify inherited work before accepting or extending it |

This file tells each incoming AI agent how to check another agent’s work for goal drift, unsupported claims, unauthorized changes, data-integrity risks, and regressions. It is a review procedure, not proof that the system has been validated or is compliant.

Read [goal.md](goal.md), [rules.md](rules.md), [tasks.md](tasks.md), and [handover.md](handover.md) before beginning. Treat handover statements as unverified until reproduced.

## Audit posture

- Inspect before editing.
- Prefer direct evidence: repository state, version-control diff, schema, test output, rendered documents, browser behavior, and read-only source checks.
- Distinguish “implemented,” “tested,” “visually verified,” “configured,” “authorized,” and “production ready.” They are not synonyms.
- Preserve uncommitted work and originals while investigating.
- Contain an unsafe write path or exposed secret immediately using a reversible change, then document it.
- Fix authorized, reversible defects that clearly restore the established goal. Escalate destructive actions, domain decisions, source-data changes, rule changes, and ambiguous scientific behavior.

## Required audit sequence

### 1. Establish identity and state

Record:

- date/time and timezone;
- reviewing agent/tool;
- repository path, branch, HEAD commit, remotes when relevant;
- tracked modifications, staged changes, untracked files, and generated artifacts;
- database/migration level and active environment type;
- handover revision and the claims being reviewed.

Never reset, clean, stash, overwrite, or commit inherited work merely to obtain a clean baseline.

### 2. Reconcile intent and authorization

Compare the requested work and diff against `goal.md` and `rules.md`.

Flag:

- changes to project scope, scientific workflow, source-of-truth rules, security, audit policy, numbering, release behavior, or standardized report format without explicit authorization;
- an agent changing goal/rule text to make its implementation appear correct;
- features presented as complete that were not requested or are unsupported;
- requested decisions that were silently replaced by an agent preference.

### 3. Trace every material change

For each changed file, migration, dependency, setting, template, or live source:

1. identify the stated task and authorization;
2. explain the actual behavior change;
3. inspect data and backward-compatibility impact;
4. find the matching `tasks.md` entry;
5. verify tests/evidence and rollback path; and
6. identify unrelated changes bundled into the same work.

A missing ledger entry is a process finding. An inaccurate entry is a data-integrity finding.

### 4. Check core business invariants

Verify with code and tests that:

- Incoming monthly sheets are six independent section tables with their controlled boundaries and ML columns;
- Environmental Monitoring uses its separate A:R model and ML series;
- current-month server routing never backfills a prior month or earlier gap;
- ML-only placeholders, exact `RESERVED` remarks, partial rows, annual reset, idempotency, concurrency, and readback follow `rules.md`;
- a layout/header mismatch blocks the affected operation rather than falling back;
- lookup preserves source location and distinct historical duplicates;
- applicable tests, criteria, actual results, and report templates are separate;
- actual results remain manual and retain zero/negative/not-entered/not-tested distinctions;
- sample release and pass/fail are not automatic;
- criteria resolution uses matching context and dated provenance and stops on ambiguity;
- finalized history pins immutable revisions; and
- report fields, signatory, incubation-label removal, and pagination match controlled requirements.

### 5. Audit data integrity and security

Review each ALCOA+ property in `rules.md`. Inspect authentication, allowlist/RBAC enforcement, server-side download controls, object-level authorization, audit-event immutability, revision reasons, timestamps/timezone, source hashes, backups/restoration, retention, and error handling.

Search tracked files, logs, screenshots, fixtures, and built assets for credentials, private keys, tokens, connection strings, sensitive names, and live laboratory data. Report the location without reproducing a secret. If exposure is confirmed, stop propagation, remove it safely from active use, and tell the project owner which credential needs rotation.

### 6. Audit configuration architecture

Trace at least one sample type, field, product, test, criterion, lookup, numbering rule, and report setting from persistent storage through the configuration service to business logic and UI. Flag duplicated hardcoded business lists, unsafe arbitrary schema editing, missing validation/versioning, destructive deletion, and historical records that change when current configuration changes.

### 7. Audit UX and accessibility

Use representative desktop and mobile viewports. Verify navigation, global search, filters, detail views, forms, unsaved-change handling, loading/empty/error states, touch targets, keyboard operation, focus visibility, labels, contrast, non-color status cues, theme preferences, and horizontal overflow.

Reject fake metrics, nonfunctional buttons, dead routes, placeholder actions presented as working, raw technical errors, and mobile layouts that merely shrink the desktop interface.

### 8. Audit reports visually

For every claimed report family:

- identify the approved reference and hashes/revisions;
- compare rendered pages, not only DOCX XML or successful file opening;
- check geometry, fonts, spacing, tables, borders, headers, footers, IDs, revision text, labels, row order, variable rows, signature area, long values, and page breaks;
- verify automatic continuous `Page X of Y` and editable logbook/page reference;
- confirm historical results, dates, remarks, identities, approvals, and signatures are absent from reusable templates; and
- confirm generated metadata traces the exact sample, source, specification, template, and result revisions.

### 9. Verify connections safely

Connection testing defaults to metadata/read-only access. Confirm spreadsheet identities, permissions, expected tabs, current-month layout, merged titles, section boundaries, and field headers. Never “repair” a live sheet or perform a sample write during audit without explicit authorization and a controlled plan.

### 10. Run reproducible verification

Use the repository’s declared commands and record exact results. At minimum, when applicable:

- dependency/install integrity;
- typecheck and lint;
- unit/domain/server tests;
- migration validation on a disposable copy;
- DOCX worker tests and rendered visual comparison;
- production build;
- desktop/mobile browser flows with console/network inspection; and
- read-only connection verifier.

A passing test suite does not cancel a contradictory manual finding. A failed test is not waived without an explicit, documented decision.

## Severity and action

| Severity | Meaning | Required action |
|---|---|---|
| Critical | Risk of falsified/lost records, unauthorized disclosure, unsafe live write, duplicate allocation, hidden audit alteration, or secret exposure | Contain reversibly, stop affected operation, notify owner immediately, document evidence |
| High | Core workflow violates goal/rules, historical integrity can change, authorization can be bypassed, or a standardized report is materially wrong | Block release; fix within authorized scope or obtain a domain decision |
| Medium | Material usability, traceability, validation, migration, or maintainability defect with a workaround | Record and schedule before the affected release |
| Low | Local polish/documentation issue without record or workflow impact | Record and fix when practical |

Do not dilute severity because the change was made by another model or because correcting it is inconvenient.

## Required audit report

Lead with the highest-severity findings. Every finding must contain:

```markdown
### [Severity] Finding title
- Requirement: goal/rule/task reference
- Evidence: file and line, diff, query, test, screenshot, or rendered page
- Observed behavior: what actually happens
- Impact: records/users/workflow affected
- Authorization: present, absent, or unclear
- Action taken: containment/fix and exact scope
- Remaining action: owner and acceptance evidence
```

Then report:

- claims verified successfully;
- commands/checks run and results;
- live-data access or writes performed (normally `none`);
- files changed by the audit and corresponding ledger entries;
- unresolved questions and release recommendation: `proceed`, `proceed with listed controls`, or `block`.

“No findings” is acceptable only after completing the relevant checks. Do not invent findings for appearance.

## Copyable incoming-agent prompt

```text
Audit the inherited IPI QC Microbiology Workspace before extending it. Read prompt.md, then read the five governance files it identifies in their stated order. Treat handover and prior-agent completion claims as assertions to reproduce. Inspect git state, diff, schema/migrations, configuration flow, tests, browser UX, DOCX renders, and only the authorized read-only live connections. Compare all changes with goal.md and rules.md, including ALCOA+, source-sheet routing, manual results, specification provenance, historical revision pinning, report fidelity, RBAC, auditability, and secrets. Report evidence-based findings by severity, take reversible corrective action within already authorized scope, and do not modify live records or make scientific decisions. Update tasks.md for every material action and handover.md before stopping.
```
