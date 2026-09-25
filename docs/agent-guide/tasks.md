# IPI QC Microbiology Workspace — Task and Change Ledger

| Document control | Value |
|---|---|
| Document ID | IPI-AI-TASKS |
| Revision | 1.0 |
| Last updated | 2026-09-25 |
| Record style | Append-only history with a maintained current workboard |

This ledger records what was requested, changed, verified, completed, deferred, or found problematic. Read [goal.md](goal.md) and [rules.md](rules.md) before acting. Current transfer details live in [handover.md](handover.md); review claims using [audit.md](audit.md).

## Logging rule

Every meaningful code, schema, configuration, documentation, dependency, infrastructure, source-data, or generated-template change must receive a ledger entry. Update the entry when the work is tested or its status changes. Do not rewrite prior facts to make later work appear cleaner. Correct an error with a new dated correction that points to the original entry.

Use ISO 8601 dates/times and the laboratory timezone (`Asia/Manila`) unless a source system supplies an immutable timestamp in another zone. Never record passwords, tokens, private keys, connection strings, or sensitive live data here.

### Required entry template

```markdown
### TASK-YYYYMMDD-NNN — Short title

- Status: Proposed | Authorized | In progress | Blocked | Completed | Reverted
- Priority: P0 | P1 | P2 | P3
- Actor/tool: Person or agent identity
- Authorization: User request, issue, or approved change reference
- Goal/rule link: Relevant section(s)
- Scope/files: Exact files, schema objects, settings, or source records
- Before: Verified starting behavior
- Change: What was actually changed
- Data impact: None, migration, read-only live access, or exact authorized write
- Verification: Commands, tests, visual checks, and results
- Problems/risks: Known limitations, failures, or uncertainty
- Rollback: Safe reversal or recovery method
- Evidence: Commit/PR, artifact, log, screenshot, or source location
- Next action/owner: Concrete next step
```

## Current workboard

### Current phase — integration, control hardening, and release validation

The repository has substantial implementation across the original Phases 1–10: the architecture and UX audit, design system, navigation/dashboard, search/tables, sample forms, managed configuration, Settings Center, specification management, report integration, and audit/versioning foundations all exist in development form. They are not all accepted as production-complete.

Active work is concentrated in Phases 9–12: approved-report integration, historical-integrity/audit control hardening, responsive/accessibility verification, and end-to-end regression testing. The controlled first release remains blocked by the P0 items below. Passing development tests does not authorize live Google writes.

### P0 — required before live operation

- Resolve the missing/changed Environmental Monitoring title in `JUNE (ENVI) 2026`. That tab failed the validated A1:R3 title check and must remain blocked until IPI confirms its intended layout.
- Configure and verify a real application database, Google OAuth client, initial administrator allowlist, and server-side service-account credential deployment. The current environment is not ready for authenticated live operation.
- Designate approved blank DOCX templates and confirm the authoritative acceptance-criteria process. Historical reports remain evidence rather than approved templates.
- Perform a controlled, read-only initial import and reconciliation, including existing color-only reservations, before enabling Google Sheets writes.

### P1 — first-release completion

- Verify each supported report family against its approved template with long names, repeated rows, page breaks, automatic `Page X of Y`, editable logbook/page references, and blank historical result/signature fields.
- Complete end-to-end tests for each Incoming category and Environmental Monitoring with category-specific forms and source provenance.
- Validate configuration versioning, historical snapshots, role enforcement, audit-event readability, backup/restore, and concurrency behavior.
- Complete representative desktop, tablet, and mobile accessibility and regression testing.

### P2 — after first release is controlled

- Add further report families only when a matching approved reference exists.
- Consider offline intake only after online allocation, idempotency, and reconciliation are proven.

## Change history

### TASK-20260923-001 — Evidence review and grounded implementation plan

- Status: Completed
- Priority: P0
- Actor/tool: Codex and project owner
- Authorization: Initial IPI workspace request
- Scope/files: Incoming workbook, Environmental Monitoring workbook, specifications workbook, `james.zip`, reference repository, project plan
- Before: No agreed IPI-specific model or workflow contract
- Change: Inspected source formats; established independent Incoming sections, separate Environmental Monitoring model, manual-result workflow, source provenance, report-family approach, Settings connections, and an equal priority for logging/lookup and report generation.
- Data impact: Read-only inspection
- Verification: Representative workbook and DOCX structure inspection
- Problems/risks: Acceptance criteria and blank approved templates were not available as standalone authoritative files.
- Rollback: Not applicable; planning record
- Evidence: Project conversation and source files supplied by the project owner
- Next action/owner: Preserve these decisions in implementation and obtain controlled templates/criteria.

### TASK-20260924-001 — Application foundation and configuration-oriented overhaul

- Status: In progress
- Priority: P0
- Actor/tool: Multiple AI agents under project-owner direction
- Authorization: Approved implementation plan and UX/configuration overhaul request
- Scope/files: React/Vite UI, Node/TypeScript server, shared configuration, tests, Python report worker, documentation
- Before: Prototype needed IPI workflows, modern usability, and managed configuration.
- Change: Built and revised the application foundation, dashboard, sample/search/report/settings flows, configuration domain, audit concepts, fixtures, and DOCX processing. The working tree contains uncommitted follow-up changes and must be audited before release.
- Data impact: Development fixtures and local data only; no authorized Google writes recorded.
- Verification: See later audit and correction entries for current test evidence.
- Problems/risks: Several handoff claims were broader than the verified behavior; model switching produced conflicting documentation.
- Rollback: Use version control after reviewing the working-tree diff; do not reset or discard uncommitted work blindly.
- Evidence: Repository history, working tree, `docs/HANDOFF.md`, and `docs/HANDOFF_GEMINI_TO_CHATGPT.md`
- Next action/owner: Continue using this guide set and independently verify every inherited claim.

### TASK-20260925-001 — Gemini handoff audit and UI/business-rule corrections

- Status: Completed
- Priority: P0
- Actor/tool: Codex
- Authorization: Project-owner request to audit the Gemini continuation and take corrective action
- Goal/rule link: Real data, non-technical UX, source mapping, responsive access
- Scope/files: `package.json`, `server/configuration.ts`, `server/domain.ts`, `server/seed.ts`, `shared/configuration.ts`, `src/App.tsx`, `src/admin.tsx`, `src/overhaul.css`, `src/styles.css`, `tests/domain.test.ts`, `scripts/verify-google-connections.mjs`
- Before: The inherited handoff stated the overhaul was complete, while inspection found fabricated dashboard schedules/progress, a placeholder command palette, a broken `/calendar` route, hardcoded presentation values, inaccessible mobile navigation, page overflow, a non-working light theme, and configuration mismatches.
- Change: Restored data-backed dashboard/search behavior; removed fake operational elements and the dead route; repaired mobile navigation, responsive layout, theme/density behavior; corrected the specifications tab to `RM/FP/AS`; preserved the accepted historical Finished Goods title alias; and added a repeatable read-only Google connection verifier plus mapping tests.
- Data impact: Application code and tests only; Google checks were read-only.
- Verification: 37 Node/domain tests passed; 6 DOCX worker tests passed; TypeScript typecheck and Vite production build passed. Real-browser desktop and phone checks found working search and Settings, no console warnings/errors, and no phone page overflow.
- Problems/risks: Working changes are not yet committed. The current environment still lacks production-ready database/authentication/secret configuration.
- Rollback: Review and selectively revert the named files through version control; preserve any later authorized changes.
- Evidence: Current working-tree diff and test output; HEAD `5d866cc`
- Next action/owner: Resolve live-readiness blockers, then commit a reviewed change set.

### TASK-20260925-002 — Read-only Google Sheets connection verification

- Status: Completed with one blocked layout
- Priority: P0
- Actor/tool: Codex
- Authorization: Project-owner request to test links saved in Settings
- Goal/rule link: Validated layouts and server-only access
- Scope/files: Configured Incoming, Specifications, and Environmental Monitoring spreadsheet links; no cells modified
- Before: Connection status was asserted but not independently established across all expected tabs.
- Change: Authenticated as `sample-logger-backend@gen-lang-client-0151849181.iam.gserviceaccount.com` and ran the read-only verifier.
- Data impact: Read-only access; no Google writes
- Verification: Incoming passed 9 monthly tabs and 54 section layouts. Specifications passed 2 tabs and 92 product rows. Environmental Monitoring passed 8 of 9 tabs; `JUNE (ENVI) 2026` had a blank/missing `ENVIRONMENTAL MONITORING` title in A1:R3 and was blocked.
- Problems/risks: A passing connection test does not authorize writes. The June Environmental tab requires human layout review.
- Rollback: None required
- Evidence: Verifier script and execution output from 2026-09-25
- Next action/owner: IPI reviews June; rerun validation after correction or an explicitly approved mapping revision.

### TASK-20260925-003 — Portable agent governance guide

- Status: Completed
- Priority: P0
- Actor/tool: Codex (GPT-6)
- Authorization: Project-owner request for Goal, Tasks, Rules, Audit, and Handover Markdown files
- Goal/rule link: Entire guide set
- Scope/files: `docs/agent-guide/goal.md`, `tasks.md`, `rules.md`, `audit.md`, `handover.md`
- Before: Two handoff documents contained conflicting and insufficiently verified claims; no single portable governance set existed.
- Change: Created five cross-linked documents that separate stable intent, strict rules, append-only work history, independent audit procedure, and volatile handover state. Added FDA/ALCOA+ oriented data-integrity safeguards and a 6S maintenance discipline without claiming regulatory certification.
- Data impact: Documentation only
- Verification: Cross-link, content, and repository-state review; regulatory references use official FDA/eCFR sources.
- Problems/risks: These documents support disciplined implementation but do not replace IPI SOPs, validation, training, or Quality approval.
- Rollback: Revert this five-file directory; preserve a copy if it contains later task history.
- Evidence: This directory at revision 1.0
- Next action/owner: Every future agent reads all five files first and maintains `tasks.md` and `handover.md` during work.

### TASK-20260925-004 — Bind connection validation to routing configuration

- Status: Completed
- Priority: P0
- Actor/tool: Codex (GPT-6)
- Authorization: Project-owner instruction to proceed toward the agreed first release
- Goal/rule link: Current-month routing, validated mappings, controlled configuration, safe live-write gate
- Scope/files: `server/configuration.ts`, `server/index.ts`, `tests/configuration.test.ts`, this ledger, active handover
- Before: A saved connection test was associated with its URL but not the exact source-routing configuration. A laboratory timezone or layout-related configuration change could leave a stale test result available to the write-enable gate.
- Change: Added canonical validation fingerprints for Incoming, Environmental Monitoring, and Specifications. Connection tests now record the applicable fingerprint and configuration revision. Enabling writes requires the current Incoming/Environmental fingerprint. Routing-sensitive changes disable writes and invalidate only affected tests; appearance-only settings retain valid tests.
- Data impact: Code and disposable test database only; no live Google access or writes
- Verification: 38 TypeScript/domain tests passed, including the new invalidation test; 6 DOCX worker tests passed; TypeScript typecheck and Vite production build passed.
- Problems/risks: The machine’s global `npm` launcher remains broken. An attempted bundled `pnpm` invocation moved npm-managed packages into `node_modules/.ignored`; the dependency folders were restored without changing source or lockfiles. Direct bundled Node/Python commands were used for reproducible verification.
- Rollback: Revert the three implementation/test files together; doing so would restore the stale-validation risk.
- Evidence: Current working-tree diff and test output dated 2026-09-25
- Next action/owner: Continue end-to-end API/browser validation and resolve the P0 live environment, June Environmental layout, reconciliation, and approved-template gates.

### TASK-20260925-005 — Enforce incubation-free report parameter labels

- Status: Completed
- Priority: P0
- Actor/tool: Codex (GPT-6)
- Authorization: Project-owner requirement to remove `after ## hrs incubation` text and preserve the standardized report format
- Goal/rule link: Standardized report generation and controlled parameter labels
- Scope/files: `worker/docx_worker.py`, `worker/test_docx_worker.py`, this ledger, active handover
- Before: The currently demonstrated report template had been manually corrected, but preparing another historical layout could retain a separate `After ... incubation:` paragraph and reintroduce the unwanted label.
- Change: The DOCX preparation worker now removes a parameter cell paragraph only when the entire paragraph is an `After ... incubation:` instruction. It then records the remaining test label and preserves that label’s original run formatting, including bold text.
- Data impact: Code and temporary test documents only; no source DOCX, generated report, or live laboratory record was modified.
- Verification: Added a regression document with a normal incubation paragraph and a separate bold test label. All 7 DOCX worker tests pass. The existing sample PDF was also rendered and visually compared with the archive-layout reference; geometry and sections were retained, both incubation prefixes were absent, the fixed Noted-by name/role was present, and automatic PAGE/NUMPAGES fields remained in the DOCX.
- Problems/risks: The inspected template still reports six drawings requiring human sanitization/layout review, which is expected for the inherited form artwork. It remains a development/historical template until IPI approves it.
- Rollback: Revert the worker and its regression test together; this would allow newly prepared templates to retain incubation instructions.
- Evidence: Current diff, worker test output, rendered `preview/IPI-Sample-Analysis-Report-Noted-By.pdf`, and its DOCX field inspection
- Next action/owner: Apply the preparation/visual-review workflow to the first IPI-approved blank template when designated.

### TASK-20260925-006 — Add the agent continuation prompt

- Status: Completed
- Priority: P0
- Actor/tool: Codex (GPT-6)
- Authorization: Project-owner request for a copy-paste prompt binding Goal, Tasks, Rules, Audit, and Handover
- Goal/rule link: Project continuity, evidence-based handover, and 6S standardization/sustainment
- Scope/files: `docs/agent-guide/prompt.md`, `goal.md`, `audit.md`, `tasks.md`, `handover.md`
- Before: The five governance files existed, but a new agent still needed manual instructions explaining where to find them, in which order to read them, and how to resume the active phase.
- Change: Added a portable copy-paste continuation prompt with the current repository path and relative-path/attachment fallback. It requires repository verification, continuation of the highest-priority unblocked task, strict observance of the five governance files, test evidence, append-only task logging, and handover maintenance.
- Data impact: Documentation only
- Verification: Confirmed all six files are colocated, cross-linked, and free of credentials. Markdown whitespace validation passed.
- Problems/risks: The absolute path must be changed if the repository moves. The relative-path fallback is included for that case.
- Rollback: Remove `prompt.md` and revert only the related cross-reference changes; preserve later task/handover history.
- Evidence: `docs/agent-guide/prompt.md` revision 1.0
- Next action/owner: Use `prompt.md` as the first item copied to any future agent, together with the complete six-file folder and repository access.

### TASK-20260925-007 � June ENVI tab validation and credentials discovery

- Status: Completed
- Priority: P0
- Actor/tool: Antigravity
- Authorization: User instructed to proceed after correcting JUNE (ENVI) 2026
- Scope/files: Google connections verifier, credentials discovery
- Before: JUNE (ENVI) 2026 layout missing ENVIRONMENTAL MONITORING title, blocking validation.
- Change: User corrected the Google Sheet layout. Discovered the missing service account credentials in a previous project directory, copied them securely to private/credentials.json.
- Data impact: Read-only access; no Google writes.
- Verification: Re-ran erify-google-connections.mjs. All Incoming, Specifications, and Environmental Monitoring tabs passed validation.
- Problems/risks: None.
- Rollback: None required.
- Evidence: Verifier script output showing 0 issues.
- Next action/owner: Configure production PostgreSQL and OAuth, or proceed with import/reconciliation.

### TASK-20260925-008 � Render Deployment Blueprint

- Status: Completed
- Priority: P1
- Actor/tool: Antigravity
- Authorization: User selected Render + Neon for deployment to retain PDF previews and avoid Vercel rewrites.
- Scope/files: ender.yaml, Dockerfile, server/index.ts
- Before: No deployment configuration existed.
- Change: Added ender.yaml blueprint for automatic deployment on Render's free tier. Added Dockerfile to install Node, Python, and LibreOffice. Patched server/index.ts to decode GOOGLE_APPLICATION_CREDENTIALS_BASE64 to support Render's environment variable limitations securely.
- Data impact: None.
- Verification: Visual code inspection.
- Problems/risks: First load after 15m of inactivity will be delayed on Render's free tier. Mitigated by advising UptimeRobot.
- Rollback: Revert ender.yaml, Dockerfile, and the few lines in server/index.ts.
- Evidence: ender.yaml file present.
- Next action/owner: User to deploy to Render or configure local .env with Neon credentials to proceed to data reconciliation.

### TASK-20260925-009 � Validate migrations and configuration seeding (Step 4)

- Status: Completed
- Priority: P1
- Actor/tool: Antigravity
- Scope/files: scripts/validate-migrations.ts
- Before: Step 4 pending in Handover.
- Change: Ran database schema migrations and initial configuration seed against a disposable local PGLite instance (.data/migration-test-db).
- Data impact: Isolated to disposable local test database. No live data touched.
- Verification: Validated that migrate() creates tables successfully and getConfiguration() seeds 7 sample types and 9 test parameters.
- Next action/owner: Step 5 - Run read-only initial import and reconcile ML records.
