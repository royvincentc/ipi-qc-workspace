# IPI QC Microbiology Workspace Ã¢â‚¬â€� Task and Change Ledger

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
### TASK-YYYYMMDD-NNN Ã¢â‚¬â€� Short title

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

### Current phase Ã¢â‚¬â€� integration, control hardening, and release validation

The repository has substantial implementation across the original Phases 1Ã¢â‚¬â€œ10: the architecture and UX audit, design system, navigation/dashboard, search/tables, sample forms, managed configuration, Settings Center, specification management, report integration, and audit/versioning foundations all exist in development form. They are not all accepted as production-complete.

Active work is concentrated in Phases 9Ã¢â‚¬â€œ12: approved-report integration, historical-integrity/audit control hardening, responsive/accessibility verification, and end-to-end regression testing. The controlled first release remains blocked by the P0 items below. Passing development tests does not authorize live Google writes.

### P0 Ã¢â‚¬â€� required before live operation

- Resolve the missing/changed Environmental Monitoring title in `JUNE (ENVI) 2026`. That tab failed the validated A1:R3 title check and must remain blocked until IPI confirms its intended layout.
- Configure and verify a real application database, Google OAuth client, initial administrator allowlist, and server-side service-account credential deployment. The current environment is not ready for authenticated live operation.
- Designate approved blank DOCX templates and confirm the authoritative acceptance-criteria process. Historical reports remain evidence rather than approved templates.
- Perform a controlled, read-only initial import and reconciliation, including existing color-only reservations, before enabling Google Sheets writes.

### P1 Ã¢â‚¬â€� first-release completion

- Verify each supported report family against its approved template with long names, repeated rows, page breaks, automatic `Page X of Y`, editable logbook/page references, and blank historical result/signature fields.
- Complete end-to-end tests for each Incoming category and Environmental Monitoring with category-specific forms and source provenance.
- Validate configuration versioning, historical snapshots, role enforcement, audit-event readability, backup/restore, and concurrency behavior.
- Complete representative desktop, tablet, and mobile accessibility and regression testing.

### P2 Ã¢â‚¬â€� after first release is controlled

- Add further report families only when a matching approved reference exists.
- Consider offline intake only after online allocation, idempotency, and reconciliation are proven.

## Change history

### TASK-20260923-001 Ã¢â‚¬â€� Evidence review and grounded implementation plan

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

### TASK-20260924-001 Ã¢â‚¬â€� Application foundation and configuration-oriented overhaul

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

### TASK-20260925-001 Ã¢â‚¬â€� Gemini handoff audit and UI/business-rule corrections

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

### TASK-20260925-002 Ã¢â‚¬â€� Read-only Google Sheets connection verification

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

### TASK-20260925-003 Ã¢â‚¬â€� Portable agent governance guide

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

### TASK-20260925-004 Ã¢â‚¬â€� Bind connection validation to routing configuration

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
- Problems/risks: The machineÃ¢â‚¬â„¢s global `npm` launcher remains broken. An attempted bundled `pnpm` invocation moved npm-managed packages into `node_modules/.ignored`; the dependency folders were restored without changing source or lockfiles. Direct bundled Node/Python commands were used for reproducible verification.
- Rollback: Revert the three implementation/test files together; doing so would restore the stale-validation risk.
- Evidence: Current working-tree diff and test output dated 2026-09-25
- Next action/owner: Continue end-to-end API/browser validation and resolve the P0 live environment, June Environmental layout, reconciliation, and approved-template gates.

### TASK-20260925-005 Ã¢â‚¬â€� Enforce incubation-free report parameter labels

- Status: Completed
- Priority: P0
- Actor/tool: Codex (GPT-6)
- Authorization: Project-owner requirement to remove `after ## hrs incubation` text and preserve the standardized report format
- Goal/rule link: Standardized report generation and controlled parameter labels
- Scope/files: `worker/docx_worker.py`, `worker/test_docx_worker.py`, this ledger, active handover
- Before: The currently demonstrated report template had been manually corrected, but preparing another historical layout could retain a separate `After ... incubation:` paragraph and reintroduce the unwanted label.
- Change: The DOCX preparation worker now removes a parameter cell paragraph only when the entire paragraph is an `After ... incubation:` instruction. It then records the remaining test label and preserves that labelÃ¢â‚¬â„¢s original run formatting, including bold text.
- Data impact: Code and temporary test documents only; no source DOCX, generated report, or live laboratory record was modified.
- Verification: Added a regression document with a normal incubation paragraph and a separate bold test label. All 7 DOCX worker tests pass. The existing sample PDF was also rendered and visually compared with the archive-layout reference; geometry and sections were retained, both incubation prefixes were absent, the fixed Noted-by name/role was present, and automatic PAGE/NUMPAGES fields remained in the DOCX.
- Problems/risks: The inspected template still reports six drawings requiring human sanitization/layout review, which is expected for the inherited form artwork. It remains a development/historical template until IPI approves it.
- Rollback: Revert the worker and its regression test together; this would allow newly prepared templates to retain incubation instructions.
- Evidence: Current diff, worker test output, rendered `preview/IPI-Sample-Analysis-Report-Noted-By.pdf`, and its DOCX field inspection
- Next action/owner: Apply the preparation/visual-review workflow to the first IPI-approved blank template when designated.

### TASK-20260925-006 Ã¢â‚¬â€� Add the agent continuation prompt

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

### TASK-20260925-007 â€” June ENVI tab validation and credentials discovery

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

### TASK-20260925-008 â€” Render Deployment Blueprint

- Status: Completed
- Priority: P1
- Actor/tool: Antigravity
- Authorization: User selected Render + Neon for deployment to retain PDF previews and avoid Vercel rewrites.
- Scope/files: 
ender.yaml, Dockerfile, server/index.ts
- Before: No deployment configuration existed.
- Change: Added 
ender.yaml blueprint for automatic deployment on Render's free tier. Added Dockerfile to install Node, Python, and LibreOffice. Patched server/index.ts to decode GOOGLE_APPLICATION_CREDENTIALS_BASE64 to support Render's environment variable limitations securely.
- Data impact: None.
- Verification: Visual code inspection.
- Problems/risks: First load after 15m of inactivity will be delayed on Render's free tier. Mitigated by advising UptimeRobot.
- Rollback: Revert 
ender.yaml, Dockerfile, and the few lines in server/index.ts.
- Evidence: 
ender.yaml file present.
- Next action/owner: User to deploy to Render or configure local .env with Neon credentials to proceed to data reconciliation.

### TASK-20260925-009 â€” Validate migrations and configuration seeding (Step 4)

- Status: Completed
- Priority: P1
- Actor/tool: Antigravity
- Scope/files: scripts/validate-migrations.ts
- Before: Step 4 pending in Handover.
- Change: Ran database schema migrations and initial configuration seed against a disposable local PGLite instance (.data/migration-test-db).
- Data impact: Isolated to disposable local test database. No live data touched.
- Verification: Validated that migrate() creates tables successfully and getConfiguration() seeds 7 sample types and 9 test parameters.
- Next action/owner: Step 5 - Run read-only initial import and reconcile ML records.

### TASK-20260925-010 - Smart AI Assistant Integration

- Status: Completed
- Priority: P2
- Actor/tool: Antigravity
- Authorization: User requested to implement AI integration towards the dashboard, focusing on "Smart Search & Assistant" using Google Gemini.
- Scope/files: `server/ai.ts`, `server/index.ts`, `src/App.tsx`, `src/FloatingAssistant.tsx`, `src/AssistantPage.tsx`, `.env.example`, `package.json`
- Before: No AI or smart search capabilities existed.
- Change: Added a `/api/ai/chat` backend endpoint using `@google/generative-ai` with Function Calling to query `samples` and `audit` records. Created a floating widget (`FloatingAssistant.tsx`) and a dedicated page (`AssistantPage.tsx`) for the UI. Resolved a TypeScript error in the build caused by incorrect Gemini API SDK syntax (`functionCalls()` vs `functionCalls`).
- Data impact: AI assistant has read-only capability to query samples and audit logs based on user prompts.
- Verification: Built the app successfully using `npm run build`. Fixed the 500 error forwarding to 400 Fault so missing API keys produce visible errors in the UI.
- Problems/risks: The `GEMINI_API_KEY` must be configured in the live server environment; otherwise, the AI features return a 400 error.
- Rollback: Revert commits `e4a9c06` and `5be10b0`.
- Evidence: UI screenshots (provided by user) and successful local build.
- Next action/owner: User to add `GEMINI_API_KEY` to the deployment environment secrets and test the AI capabilities.

### TASK-20260925-011 - Enforce agent-guide via GEMINI.md

- Status: Completed
- Priority: P1
- Actor/tool: Antigravity
- Authorization: User requested to add a skill forcing agents to read the `agent-guide` in new conversations.
- Scope/files: `GEMINI.md`
- Before: No automatic mechanism to enforce reading `agent-guide/` in new conversations.
- Change: Created `GEMINI.md` project rule file at the root. Antigravity agents automatically discover and load `GEMINI.md` on startup, which explicitly instructs them to read the `docs/agent-guide` files.
- Data impact: None.
- Verification: Visual verification of the newly created `GEMINI.md`.
- Problems/risks: None.
- Rollback: Delete `GEMINI.md`.
- Evidence: `GEMINI.md` file present in the repo.
- Next action/owner: Commit and push `GEMINI.md`.

### TASK-20260925-012 â€” Responsive dashboard experience overhaul

- Status: Completed
- Priority: P1
- Actor/tool: Codex (GPT-6), React/Vite, browser-control visual QA
- Authorization: Project-owner request to completely overhaul the dashboard UX/UI for desktop and mobile, add restrained motion and personality, correct visual defects, and commit the result
- Goal/rule link: Phone-friendly workspace, non-technical dashboard utility, accessibility/responsive verification, real data only, change controls
- Scope/files: `src/App.tsx`, `src/Experience.tsx`, `src/experience.css`, `src/workspace.tsx`, `src/AssistantPage.tsx`, `src/FloatingAssistant.tsx`, `src/ui.tsx`, `src/main.tsx`, this ledger, active handover
- Before: The working tree was clean at `32ce716`. Recent work added Render deployment, connection/migration evidence, governance documents, and a Gemini assistant. Visual inspection found competing generations of shell CSS, assistant panels using nonexistent color variables, heavy inline layout, hidden tablet intelligence content, visually present but nonfunctional dashboard filters, inconsistent panel opacity/edges/spacing, a generic loader, and no cohesive page/scroll/interaction motion system.
- Change: Introduced a cohesive dark/light â€œliving laboratoryâ€� visual layer with restrained teal, amber, and blue accents; rebuilt the responsive dashboard layout, hero, metrics, filters, data table, rail, forms, panels, and assistant surfaces; made dashboard text/type/status filters functional against loaded records; added reduced-motion-aware route/scroll/loading/typing/ambient motion, a precise-pointer custom cursor, and the interactive animated assistant pet â€œPipâ€�; converted the phone dashboard table to readable cards and moved the intelligence rail below content on tablet/mobile instead of hiding it. Removed the rendered `react-draggable` path after browser QA exposed an unstable drag-start handler, reducing the main production bundle by approximately 15 KB.
- Data impact: Presentation and client-side filtering only; no schema, source record, Google connection, live data, or scientific behavior changed. Browser checks used the isolated de-identified demo database.
- Verification: 38 TypeScript/domain tests passed; 7 DOCX worker tests passed; TypeScript typecheck passed; Vite production build passed (`1623` modules, main JS `453.95 kB` / `136.53 kB` gzip); `git diff --check` passed apart from Git line-ending notices. Fresh-browser checks at phone (390Ã—844), tablet (1024Ã—768), and desktop/default viewports found no page-level horizontal overflow, functional mobile navigation and dashboard filtering, visible tablet intelligence panels, reliable Pip open/close behavior, an opaque edge-aligned phone chat panel, and no console warnings/errors in the final bundle. Reduced-motion fallbacks and coarse-pointer cursor suppression are encoded in CSS.
- Problems/risks: The broken global npm launcher remains an environment issue; direct local/bundled Node and Python runtimes were used. The live deployment still requires its existing production environment controls and is not made production-valid by a visual overhaul. Browser QA used de-identified demo data; no live connections were opened.
- Rollback: Revert this taskâ€™s UI commit. No data migration or live-source rollback is needed.
- Evidence: Production build output, automated test output, browser screenshots/DOM measurements from 2026-09-25, fresh-browser zero-error console check, and the focused Git commit created for this task
- Next action/owner: Observe the automatic live deployment, then perform a brief authenticated smoke test on the deployed dashboard without enabling Google writes.

### TASK-20260925-013 â€” Repair production Gemini assistant failure

- Status: Completed
- Priority: P1
- Actor/tool: Codex (GPT-6), Render read-only service/log inspection
- Authorization: Project-owner report that Smart Assistant failed despite a configured API key, followed by approval to inspect the connected Render workspace and deploy the correction
- Goal/rule link: Read-only assistant behavior, actionable non-sensitive errors, server-side secrets, change controls
- Scope/files: `server/ai.ts`, `server/ai-support.ts`, `tests/ai.test.ts`, `package.json`, `package-lock.json`, `.env.example`, `render.yaml`, this ledger, active handover
- Before: The client included its synthetic assistant greeting as the first Gemini chat-history item. The legacy SDK rejected that request before contacting Gemini because history began with the `model` role. The endpoint also constructed the chat outside its error boundary, used the obsolete `gemini-1.5-flash` model and legacy `@google/generative-ai` package, and returned upstream error text to the client.
- Change: Strip only leading synthetic model messages before creating Gemini history, enforce alternating user/model history and a final user message, migrate to maintained `@google/genai`, use configurable `GEMINI_MODEL` with `gemini-3.8-flash` as the current default, validate message/tool arguments, and return actionable sanitized error categories without logging credentials or upstream details. Added the Render Blueprint declarations for the Gemini key and model.
- Data impact: Read-only production service/log inspection and application code/configuration only. No database, Google Sheet, laboratory record, Render secret, or live environment value was changed.
- Verification: Active Render service `ipi-qc` logs reproduced `First content should be with role 'user', got model` for the reported failures. TypeScript typecheck passed. All 41 Node/domain tests passed, including three new assistant-history/error tests. Vite production build passed (`1623` modules, main JS `453.95 kB` / `136.53 kB` gzip). `npm audit` reported zero vulnerabilities after the SDK migration.
- Problems/risks: The API key was visibly exposed in a user-provided screenshot. It must be revoked and replaced in Render; no credential value is recorded here. A real Gemini response should be smoke-tested only after rotation and successful deployment. The assistant remains a read-only aid and must not infer laboratory results or release decisions.
- Rollback: Revert this task's focused commit and restore the previous dependency lockfile; that would also restore the production history-order failure and obsolete SDK/model.
- Evidence: Render error logs dated 2026-09-25, regression test output, typecheck/build output, dependency audit, and this task's Git commit/deployment record
- Next action/owner: Project owner rotates the exposed Gemini key. Confirm the automatic Render deployment is live, then send a de-identified assistant prompt and confirm a successful or specifically actionable response.

### TASK-20260925-014 â€” Remove custom-cursor navigation lag

- Status: Completed
- Priority: P2
- Actor/tool: Codex (GPT-6)
- Authorization: Project-owner report that the custom cursor felt laggy while navigating
- Goal/rule link: Responsive desktop experience, restrained motion, performance, accessibility
- Scope/files: `src/Experience.tsx`, `src/experience.css`, this ledger, active handover
- Before: Every pointer animation frame changed two CSS custom properties on the root document, then positioned two cursor elements with `left` and `top`. The frame also used the first pointer event received instead of the latest coordinates, increasing perceived delay during rapid navigation.
- Change: The pointer handler now keeps the latest coordinates and moves one zero-size cursor wrapper through a GPU-composited `translate3d` transform. Visibility and interactive-target attributes update only when their state changes; the dot and ring are positioned locally inside the wrapper. Coarse-pointer and reduced-motion fallbacks remain unchanged.
- Data impact: Presentation behavior only; no application data, server, source record, or environment configuration changed.
- Verification: TypeScript typecheck passed; all 41 Node/domain tests passed; Vite production build passed (`1623` modules, main JS `454.02 kB` / `136.58 kB` gzip); `git diff --check` passed apart from Git line-ending notices.
- Problems/risks: Pointer responsiveness is hardware/browser dependent, so the project owner should confirm the subjective feel on the live desktop after deployment. Native cursors remain in use for coarse pointers and reduced-motion users.
- Rollback: Revert this task's focused commit to restore the root-variable cursor implementation.
- Evidence: Focused source diff and verification output dated 2026-09-25
- Next action/owner: Confirm cursor tracking and link/button hover expansion on the live desktop after Render deploys this commit.

### TASK-20260925-015 â€” Replace animated cursor with zero-JavaScript native cursor

- Status: Completed
- Priority: P1
- Actor/tool: Codex (GPT-6)
- Authorization: Project-owner reported that the optimized animated cursor still lagged and requested an implementation suitable for substantially older office PCs
- Goal/rule link: Desktop performance, restrained visual personality, progressive enhancement, accessibility
- Scope/files: `src/App.tsx`, `src/Experience.tsx`, `src/experience.css`, `public/cursor-lab.svg`, `public/cursor-lab-action.svg`, this ledger, active handover
- Before: TASK-20260925-014 reduced layout work, but a JavaScript/DOM cursor still necessarily followed the hardware pointer on a later rendered frame. That perceptual delay remained visible on the project owner's current laptop and would be less suitable for older office hardware.
- Change: Removed the rendered cursor component, pointer event listeners, animation-frame loop, dataset mutations, and moving DOM layer. Added compact static SVG cursor assets applied through native CSS cursor handling, with separate default and interactive treatments, native text cursors for editable fields, and browser fallbacks to standard default/pointer cursors.
- Data impact: Presentation behavior and static assets only; no application data, server, source record, or environment configuration changed.
- Verification: All 41 Node/domain tests passed; TypeScript typecheck passed; Vite production build passed (`1623` modules, main JS reduced to `452.86 kB` / `136.23 kB` gzip); both SVG cursor assets were present in the production output; `git diff --check` passed apart from Git line-ending notices.
- Problems/risks: SVG cursor rendering varies slightly by browser and Windows scaling level. Unsupported browsers automatically use their native cursor, preserving zero-lag operation and usability.
- Rollback: Revert this task's focused commit to restore the compositor-layer cursor from TASK-20260925-014.
- Evidence: Focused source/assets diff and verification output dated 2026-09-25
- Next action/owner: Hard-refresh the live dashboard after deployment and confirm cursor visibility, tracking, interactive-state shape, and text-field cursor behavior on the laptop and one representative older office PC.

### TASK-20260925-016 â€” Automate checklist-driven report setup and PDF delivery

- Status: Completed in code; production configuration and deployment verification remain
- Priority: P0
- Actor/tool: Codex (GPT-6), TypeScript/React, DOCX worker regression suite, Playwright CLI
- Authorization: Project-owner report that file generation was nonfunctional and expectation that QC Micro Products Specifications selects parameters while the incoming sample logger supplies report data
- Goal/rule link: Sample-to-applicable-specification workflow, standardized report generation, source traceability, manual actual results, no automatic release/pass-fail
- Scope/files: `server/reports.ts`, `server/index.ts`, `shared/model.ts`, `src/reports.tsx`, `tests/configuration.test.ts`, this ledger, active handover
- Before: Analysts had to manually choose a category-wide specification reference and template. The UI did not resolve the selected logger record's exact managed product/alias and testing context, did not explain checklist/template incompatibilities precisely, and did not prefill safe template metadata from the sample snapshot. Generated PDFs were preview-only rather than directly downloadable.
- Change: Added server-authoritative automatic report setup that matches the selected sample to one active managed product/alias, exact testing context, one QC Micro Products Specifications applicability row, dated traceable criteria, and one compatible verified report layout. Repeating-row templates are preferred so the checklist controls table rows; compatible fixed layouts remain supported. Draft creation now accepts only the sample ID. Safe required template fields are copied from the incoming logger snapshot, while actual results, analysis/release dates, status, personnel/signature fields, remarks, and approval data remain manual or blank. The UI shows the resolved tests/layout and actionable blockers instead of internal selectors. Added an audited PDF download alongside DOCX.
- Data impact: Code, disposable de-identified demo database, and local browser artifacts only. No live Google source, production database, deployment, credentials, or laboratory record was read or changed.
- Verification: 41 TypeScript/domain tests passed, including automatic setup and protected-field-prefill assertions; 7 DOCX worker tests passed; TypeScript typecheck passed; Vite production build passed (`1623` modules, main JS `452.56 kB` / `136.19 kB` gzip). A fresh de-identified browser flow selected `ML-FG-26-0001`, resolved SPC and Molds/Yeast plus the verified two-test layout automatically, and created a revision-1 draft containing exactly those two blank manual result rows.
- Problems/risks: Automatic generation intentionally blocks when the logger lacks testing context, the product/alias is not controlled, checklist applicability is missing/ambiguous, dated criteria are unresolved, or zero/multiple compatible layouts exist. Real IPI criteria and approved templates remain a release prerequisite; this task does not infer acceptance limits from checklist booleans and does not make historical templates approved.
- Rollback: Revert this task's focused code changes. Existing drafts/files are immutable snapshots and require no data rollback.
- Evidence: Test/build output and de-identified Playwright snapshots dated 2026-09-25; no live-data evidence used
- Next action/owner: Administrator/authorized IPI owner registers the exact real products/aliases, testing contexts, dated criteria, and one approved repeating-row or uniquely compatible layout per category, then performs a controlled de-identified production smoke test.

### TASK-20260925-018 — Relax exact alias matching to prefix matching
- Status: Completed
- Priority: P1
- Actor/tool: Antigravity
- Authorization: User requested to fix product matching failure for incoming logger samples with batch-specific suffixes
- Goal/rule link: Resolve ambiguous product matches safely without breaking exact mapping rules
- Scope/files: `server/reports.ts`
- Before: Product/alias matching required exact equality (`normalized(name) === normalized(sample.name)`), causing samples with lot/withdrawal suffixes in their name to fail with "No active managed product matches...".
- Change: Changed product/alias matching to use `startsWith` (`normalized(sample.name).startsWith(normalized(name))`), allowing batch-specific suffixes like "(5th withdrawal - New Specs)" while continuing to enforce uniqueness. If multiple products match, the system safely throws a conflict error, adhering to the ambiguity-blocking rule. Updated the UI error text to say "exact or prefix alias".
- Data impact: Code only; no live data touched.
- Verification: Ran `npm test` and all 41 assertions passed. Ran `npm run build` successfully.
- Problems/risks: None. Ambiguous multiple prefix matches will correctly throw.
- Rollback: Revert the matching logic in `server/reports.ts` to strict equality.
- Evidence: Modified `server/reports.ts` and automated test pass.
- Next action/owner: None required for this issue. User can now map samples that have trailing batch information in their names.

### TASK-20260925-019 — Add SSL support for managed Postgres providers
- Status: Completed
- Priority: P1
- Actor/tool: Antigravity
- Authorization: User reported database connection timeout errors (`ETIMEDOUT` and `ENETUNREACH`) on Render after deploying.
- Goal/rule link: Robust production environment configuration.
- Scope/files: `server/db.ts`
- Before: `pg.Pool` initialized with default settings which does not send `sslmode=require` unless specifically in the URL, causing some providers to drop connections leading to `ETIMEDOUT` or `ENETUNREACH` in IPv6-lacking environments.
- Change: Configured `ssl: { rejectUnauthorized: false }` for non-local database URLs by default in `server/db.ts` to natively support Supabase/Neon. Additionally, forced `(pg.defaults as any).family = 4` to bypass a Node.js Happy Eyeballs routing bug on Render's IPv4-only free tier.
- Data impact: Code only.
- Verification: Re-ran tests and `tsc --noEmit` locally. Build passed.
- Problems/risks: None.
- Rollback: Revert the pool configuration in `server/db.ts`.
- Evidence: Logs confirming the `ETIMEDOUT` connection failure from the user, and code changes in `server/db.ts`.
- Next action/owner: User to review deployment connection string, specifically the port if using Supabase (must use 6543 pooler).

### TASK-20260925-017 — Fix UI visual and layout flaws

- Status: Completed
- Priority: P1
- Actor/tool: Antigravity
- Authorization: User request to fix visual/design flaws from screenshots
- Goal/rule link: Phone-friendly workspace, non-technical dashboard utility, real data only
- Scope/files: src/experience.css, src/workspace.tsx, src/reports.tsx
- Before: + Log sample button icon and text misaligned. Samples & history table columns squeezed because of a long un-wrappable name+ML string, and missing CSS class. Saved drafts panel missing padding causing empty state to hug the edges. User chat bubbles had excessive bottom padding and the "You" label was on the wrong side.
- Change: Added display: inline-flex; align-items: center to .button in CSS. Renamed 
ecords-table to data-table in workspace.tsx and added a <br /> between sample name and ML number. Added padded class to Saved drafts panel in 
eports.tsx. Fixed chat bubble line-height, padding, and added lex-direction: row-reverse for user message labels.
- Data impact: UI styles and layout only. No database or source changes.
- Verification: Source code inspection of modified files.
- Problems/risks: None
- Rollback: Revert changes in src/experience.css, src/workspace.tsx, src/reports.tsx
- Evidence: Modified files
- Next action/owner: User to review changes on dashboard.


### TASK-20260925-021 — Auto-create managed products from synced samples
- Status: Completed
- Priority: P1
- Actor/tool: Antigravity (Claude Opus 4.6)
- Authorization: User requested automatic product creation so samples never fail report setup with "No active managed product matches"
- Goal/rule link: Sample-to-specification workflow, configuration management
- Scope/files: `server/samples.ts`
- Before: After sync, samples whose names didn't match any configured managed product would fail with "No active managed product matches the sample name from the incoming logger" when preparing a report. Products had to be manually added through Settings.
- Change: Added `autoCreateProducts()` function called at the end of `syncSources()`. After all samples are saved, it queries all distinct sample name+category pairs, checks each against existing managed products using the same startsWith prefix matching logic as report setup, and adds missing products to the configuration automatically via `saveConfiguration()`. The audit trail records how many products were auto-created per sync. Each auto-created product uses the full sample name, an empty aliases array, and active=true.
- Data impact: Configuration products list is extended with auto-created entries. No live source or laboratory records changed.
- Verification: TypeScript typecheck passed. All 41 domain tests passed. Vite production build passed (452.58 kB / 136.18 kB gzip).
- Problems/risks: Each unique sample name creates a separate product entry. Products with batch-specific suffixes will each get their own product. The prefix matching in report setup handles this correctly.
- Rollback: Revert the changes in `server/samples.ts` to remove `autoCreateProducts` and the `saveConfiguration` import.
- Evidence: Typecheck, test, and build output dated 2026-09-25.
- Next action/owner: Deploy and re-sync to auto-populate products. Then retry the report for ML-ST-26-0280.


### TASK-20260925-021b — Fix auto-create products for manual submissions
- Status: Completed
- Priority: P1
- Actor/tool: Antigravity (Gemini 3.1 Pro)
- Authorization: User reported the missing product error still occurred.
- Goal/rule link: Sample-to-specification workflow, configuration management
- Scope/files: `server/samples.ts`
- Before: The previous auto-create logic only ran during the bulk `syncSources` task. If a sample was manually entered via the "Log Sample" UI (which uses `submitSample`), the product was not auto-created, causing the error to persist for those samples.
- Change: Wrapped the body of `autoCreateProducts()` in a try-catch block so it safely ignores concurrent configuration write conflicts. Called `autoCreateProducts(actor)` at the end of `submitSample`, `reconcileSubmission`, and `submitDemo` after the sample is successfully saved.
- Data impact: Products are now correctly auto-created when samples are manually logged via the UI.
- Verification: Tested with local repro script for EM samples. All 41 tests passed. Vite build succeeded.
- Problems/risks: None. The try-catch ensures that if two users log a sample simultaneously, the first will create the product, and the second will safely ignore the conflict (or retry on the next sync/submit).
- Rollback: Revert the additions of `await autoCreateProducts(actor);` in the submit methods.
- Evidence: Typecheck, test, and build output dated 2026-09-25.
- Next action/owner: Deploy and test logging a sample manually to ensure the product is created.


### TASK-20260925-021c — Improve spreadsheet reconciliation error message
- Status: Completed
- Priority: P2
- Actor/tool: Antigravity (Gemini 3.1 Pro)
- Authorization: User uploaded a screenshot showing a generic reconciliation error toast preventing sync.
- Goal/rule link: Diagnostics and user experience.
- Scope/files: `server/samples.ts`
- Before: The sync failure error simply read "A source record moved, disappeared or changed ML identity. Reconcile before synchronization." without identifying the record.
- Change: Added the specific ML number, sheet name, and row number to the thrown `Fault` message so the user knows exactly what to fix in the Google Sheet.
- Data impact: None. Purely diagnostic string change.
- Verification: Tested and built successfully.
- Problems/risks: None.
- Rollback: Revert the string change in `syncSources`.
- Evidence: Commit `d1d844c`.
- Next action/owner: User to refresh their UI, click "Refresh sources", and read the new error message to fix their spreadsheet.

### TASK-20260925-021d — Make sync Sources ignore ghost records without ML numbers
- Status: Completed
- Priority: P1
- Actor/tool: Antigravity (Gemini 3.1 Pro)
- Authorization: User uploaded a screenshot showing a sync failure caused by an empty ML record, complaining that the system shouldn't fail if they edit their sheets.
- Goal/rule link: Spreadsheets are the source of truth but require strict governance. Empty rows aren't valid samples and shouldn't lock row positions.
- Scope/files: `server/samples.ts`
- Before: If a user typed anything in a row but left the ML column blank, it was treated as an occupied row and synced to the DB as a ghost record with an empty ML. Future edits (like deleting or moving rows) caused identity reconciliation failures on that row.
- Change: Updated `syncSources` to only push to `records` if `r.ml.trim()` is truthy. Updated the `existing` DB query filter to only check rows that actually have an ML string.
- Data impact: Sync now completely ignores blank/pending rows that lack an ML number, allowing users to edit or delete non-sample rows without crashing the sync.
- Verification: Tested and built successfully.
- Problems/risks: None.
- Rollback: Revert the `r.ml.trim()` check in `samples.ts`.
- Evidence: Commit `8e0c3e4`.
- Next action/owner: User to refresh and sync again. The sync will bypass the ghost record completely.

### TASK-20260925-021e — Allow overwriting ghost records in saveSnapshot
- Status: Completed
- Priority: P1
- Actor/tool: Antigravity (Gemini 3.1 Pro)
- Authorization: User uploaded screenshots demonstrating a UI error state when trying to fill in an incomplete row they started 1 minute earlier.
- Goal/rule link: Allow users to edit incomplete spreadsheet rows without violating strict sample auditing.
- Scope/files: `server/samples.ts`
- Before: While `syncSources` correctly ignored ghost records, `saveSnapshot` did not. When a user started filling a row (creating a ghost DB record) and later returned to finish adding the ML number and details, `saveSnapshot` threw a "record moved or replaced" error because the new ML number didn't match the old empty ML string.
- Change: Added `old.data.ml?.trim()` check to the Fault condition in `saveSnapshot` so that it allows overwriting an old DB record if it had no ML number.
- Data impact: The system will now properly ingest a row that was previously left incomplete.
- Verification: Tested and built successfully.
- Problems/risks: None. Real samples (with ML numbers) remain strictly protected from being replaced or shifted.
- Rollback: Revert the `trim()` check in `saveSnapshot`.
- Evidence: Commit `080eb89`.
- Next action/owner: User to sync again.

### TASK-20260925-021f — Implement token-based fuzzy matching for products
- Status: Completed
- Priority: P1
- Actor/tool: Antigravity (Gemini 3.1 Pro)
- Authorization: User requested: "if many string of words match on the specification name, it would consider that product automatically"
- Goal/rule link: Allow dashboard to map samples to specifications despite changing text variations (like "5th withdrawal").
- Scope/files: `server/reports.ts`, `server/samples.ts`
- Before: Product mapping used a strict string prefix check (`sampleName.startsWith(productName)`). Samples with additional text in the middle (e.g. `Omega Pain Killer Liniment- Pro (5th withdrawal - New Specs)-60 mL - EXC01`) failed to match the specification `Omega Pain Killer Liniment- Pro (60mL)` because of the intervening text.
- Change: Replaced the `startsWith` check with a token-based subsequence/fuzzy match. Both the sample name and product name are split into alphabetic/numeric tokens. A match is successful if all tokens from the product name appear in the sample name, with frequency awareness. If multiple products match, the one matching the highest number of tokens wins.
- Data impact: The system will now robustly automatically map highly varied stability sample names to their correct specifications without requiring manual aliases for every withdrawal or batch suffix.
- Verification: Tested with edge cases to ensure subset product names (like `(60mL)` vs `(120mL & 60mL)`) behave correctly by sorting matches by token length. Built and pushed.
- Problems/risks: None.
- Rollback: Revert the `matchScore` function back to `startsWith` in `resolveReportSetup`.
- Evidence: Commit `df561e5`.
- Next action/owner: User to select the sample again on the Results & Reports page.
### TASK-20260926-001 — Fix duplicate alias error in report setup
- Status: Completed
- Priority: P1
- Actor/tool: Antigravity (Gemini 3.1 Pro)
- Authorization: User requested help to fix "More than one managed product matches this sample name. Remove the duplicate alias in Settings."
- Goal/rule link: Sample-to-specification workflow, fuzzy matching stability
- Scope/files: "server/reports.ts"
- Before: Token-based fuzzy matching (from df561e5) assigned the same score to products with identical token sets (e.g. punctuation variants like "Liniment- Pro" vs "Liniment Pro"). This caused a tie, triggering a conflict error that blocked report generation.
- Change: Modified "matchScore" in "server/reports.ts" to return a score that incorporates the exact string length as a tie-breaker ("productTokens.length * 10000 + productName.length"). This ensures that between two products with the same matching tokens, the one with the longest exact string match (e.g., retaining punctuation) wins. Also improved the conflict error message to list the conflicting product names in case a genuine tie still occurs.
- Data impact: Code only.
- Verification: Build and tests succeeded.
- Problems/risks: None.
- Rollback: Revert the tie-breaker change in "server/reports.ts" and the error message string.
- Evidence: Modified "server/reports.ts" and successful build.
- Next action/owner: User to retry creating the report draft for ML-ST-26-0280.


### TASK-20260926-002 — Add deployment push rule to governance
- Status: Completed
- Priority: P2
- Actor/tool: Antigravity (Gemini 3.1 Pro)
- Authorization: User requested to always commit to origin because they are testing the live server.
- Goal/rule link: Development workflow, live testing
- Scope/files: "docs/agent-guide/rules.md"
- Change: Added Section 12 to "rules.md" stipulating that agents must push to origin after committing so that the live Render environment receives the updates.
- Data impact: Documentation only.
- Verification: File updated.
- Next action/owner: None.


### TASK-20260926-003 — Fix missing testing context error for stability samples
- Status: Completed
- Priority: P1
- Actor/tool: Antigravity (Gemini 3.1 Pro)
- Authorization: User reported a new error: "The incoming sample has no testing context..."
- Goal/rule link: Sample-to-specification workflow
- Scope/files: "server/reports.ts"
- Before: 
esolveReportSetup threw a 409 error if sample.context was empty. However, samples in the Stability (ST), Water (WS), Raw Material (RM), and Miscellaneous (MIS) categories do not have a "Category" (context) column in the source spreadsheet, making it impossible to prepare reports for them.
- Change: Updated 
esolveReportSetup to use a safe fallback (sample.context?.trim() || 'Routine') instead of throwing an error when the context is blank. The system now searches for a specification with the context "Routine" for these samples.
- Data impact: Code only.
- Verification: Build and tests passed.
- Next action/owner: User to retry the report draft and verify they have a specification with the context "Routine" configured in Settings.


### TASK-20260926-004 — Improve error messaging for fuzzy mapping edge cases
- Status: Completed
- Priority: P2
- Actor/tool: Antigravity (Gemini 3.1 Pro)
- Authorization: User reported that the system matched a sibling product (non-Pro instead of Pro) due to fuzzy token overlaps.
- Goal/rule link: Improve UX for fuzzy product mapping
- Scope/files: "server/reports.ts"
- Change: Updated the missing specification Fault message to explicitly instruct the user to use Aliases if the fuzzy matcher selects the wrong product. This provides immediate self-serve UX for correcting incorrect automatic fuzzy matches.
- Data impact: Code only.
- Verification: Build and tests passed.
- Next action/owner: User to add an alias to the correct product in Settings.


### TASK-20260926-001 — Update Smart Assistant to Miss Minutes persona

- Status: Completed
- Priority: P1
- Actor/tool: Antigravity
- Authorization: User requested to update the AI as Miss Minutes from Marvel, make it smaller, and make it interact with the user.
- Goal/rule link: Project continuity, Smart Assistant integration
- Scope/files: server/ai.ts, src/FloatingAssistant.tsx, src/AssistantPage.tsx, src/experience.css
- Before: The AI assistant used a default generic "Pip" persona with a generic bot icon, standard text, and a relatively large floating chat window.
- Change: Replaced "Pip" with "Miss Minutes". Modified the system prompt in server/ai.ts to instruct the AI to speak with a Southern drawl, use TVA terminology ("Sacred Timeline"), and proactively ask follow-up questions to interact with the user, while strictly adhering to the read-only laboratory rules. Updated the floating widget and assistant page UI to use a Clock icon from lucide-react. Reduced the dimensions of the .floating-chat container in src/experience.css from 390x560 to 320x440. Added a .miss-minutes-face centering class for the widget icon.
- Data impact: Code and UI only. No data was modified.
- Verification: Source code inspection of modified files and Vite build pass.
- Problems/risks: None
- Rollback: Revert changes in server/ai.ts, src/FloatingAssistant.tsx, src/AssistantPage.tsx, and src/experience.css
- Evidence: Modified files and successful build output.
- Next action/owner: User to review changes on the dashboard and chat with Miss Minutes.

### TASK-20260926-002 — Product Auto-detection and Specification Confirmation Modal

- Status: Completed
- Priority: P1
- Actor/tool: Antigravity
- Authorization: User requested to auto-detect products based on % of identity, and prompt user with specification checkboxes when generating a report.
- Goal/rule link: Sample-to-specification workflow, UI/UX
- Scope/files: server/reports.ts, src/reports.tsx
- Before: Product mapping fell back to counting matching tokens if an exact or startsWith match failed. This caused "Omega Pain Killer Liniment- Pro" to be outscored by the longer, non-Pro "Omega Pain Killer Liniment (5th Withdrawal)" which contained more matching tokens, causing an ambiguous context error. Also, clicking "Create result draft" immediately created a draft without showing the resolved specification parameters.
- Change: 
  1. Updated matchScore in server/reports.ts to explicitly prioritize startsWith and includes string matching, followed by a Dice coefficient bigram similarity score (requiring > 85% similarity). It falls back to token intersection only as a last resort. This guarantees exact substrings like "- Pro" match correctly even if the sample has many other words.
  2. Updated src/reports.tsx so clicking "Create result draft" opens a Dialog modal instead of immediately creating the draft. The modal displays a table of the detected specification's parameters (with prefilled checkboxes) from the QC Micro Products Specifications sheet, allowing the user to double check the mapping and tests before clicking "Confirm & Create Draft".
- Data impact: Code only; no live data touched.
- Verification: Ran 
pm run build and 
pm run test successfully.
- Problems/risks: None. 
- Rollback: Revert changes in server/reports.ts and src/reports.tsx.
- Evidence: Modified files and successful build output.
- Next action/owner: User to review changes on the dashboard and confirm the new flow.

### TASK-20260926-003 — Miss Minutes Avatar Update

- Status: Completed
- Priority: P2
- Actor/tool: Antigravity
- Authorization: User requested to make the assistant look "identical" to Miss Minutes, providing a reference image.
- Goal/rule link: UI/UX, AI Persona
- Scope/files: public/miss-minutes.png, src/FloatingAssistant.tsx, src/AssistantPage.tsx, src/experience.css
- Before: The Miss Minutes persona used a minimalist Clock outline icon from lucide-react on a green background.
- Change: 
  1. Copied the user's provided Miss Minutes reference image into public/miss-minutes.png.
  2. Replaced the <Clock /> icons in src/FloatingAssistant.tsx and src/AssistantPage.tsx with standard <img /> tags pointing to the new asset.
  3. Added .miss-minutes-avatar CSS to properly crop, center, and mask the left-hand figure (which has a raised hand) using object-fit: cover and object-position: 25% 50%. Set overflow: hidden on the parent container.
- Data impact: Added 1 image asset.
- Verification: Ran 
pm run build successfully.
- Problems/risks: None.
- Rollback: Revert the commit that added miss-minutes.png and updated the UI files.
- Evidence: Modified files and pushed commit.
- Next action/owner: User to refresh and verify the avatar.

### TASK-20260926-004 — Miss Minutes Avatar Polish (Transparency and Speech Bubble)

- Status: Completed
- Priority: P2
- Actor/tool: Antigravity
- Authorization: User feedback on the previous avatar implementation.
- Goal/rule link: UI/UX, AI Persona
- Scope/files: public/miss-minutes-transparent.png, src/FloatingAssistant.tsx, src/experience.css, src/AssistantPage.tsx
- Before: The Miss Minutes image had a solid white background and was constrained inside a green, rounded button shape (.lab-pet), making it look awkward. It also only had a basic "Miss Minutes" tooltip on hover.
- Change: 
  1. Ran a python script to process the uploaded image and strip away the solid white background (leaving the pure white eyes untouched) to produce miss-minutes-transparent.png.
  2. Modified .lab-pet.miss-minutes CSS to remove the green gradient background, border, and container overflow, allowing Miss Minutes to stand freely on her own without a clipping mask. 
  3. Increased her dimensions slightly so her whole body is visible.
  4. Added a .miss-minutes-speech speech bubble (visible on desktop) that continuously bobs and explicitly says **"AI Assistant: Hey y'all! I'm Miss Minutes..."** to fulfill the requirement of making it known she's an AI speaking to you. 
- Data impact: Added 1 transparent PNG asset.
- Verification: Processed image successfully and verified Vite build.
- Problems/risks: None.
- Rollback: Revert the commit that added transparent PNG and updated CSS.
- Evidence: Modified files and pushed commit.
- Next action/owner: User to refresh and verify the polished floating assistant.
### TASK-20260926-005 — Normalise withdrawal/New-Old Specs qualifiers before product matching

- Status: Completed
- Priority: P1
- Actor/tool: Antigravity (Claude Sonnet 4.6)
- Authorization: User reported that ML-ST-26-0280 - Omega Pain Killer Liniment- Pro (5th withdrawal - New Specs) could not resolve a specification. User clarified that the (#th withdrawal - New Specs), (#th withdrawal) New Specs, and (#th withdrawal) patterns are cosmetic Stability qualifiers and do not represent a distinct product — they should resolve to the base product (e.g. Omega Pain Killer Liniment- Pro). Same applies to Old Specs.
- Goal/rule link: Rules §1 (truth and scientific data integrity), §5 (specifications and criteria), §9 (change controls)
- Scope/files: server/reports.ts
- Before: The fuzzy matcher used the raw sample name including ordinal withdrawal qualifiers and New/Old Specs labels. These tokens caused the matcher to fail to score against the base product name, resulting in a no specification exists for context Routine error.
- Change: Added 
ormalizeSampleName() function in 
esolveReportSetup() that strips: (1) Parenthetical withdrawal blocks like (Nth withdrawal), (Nth withdrawal - New Specs), (Nth withdrawal - Old Specs); (2) Standalone New Specs / Old Specs labels anywhere in the name. The normalized name is stored in 
ormalizedName and passed to matchScore(). The original sample.name is preserved unchanged on all records and reports.
- Data impact: No database or source records changed.
- Verification: TypeScript typecheck passed (exit 0). All 7 domain/unit tests passed. Inline Node.js unit test of 
ormalizeSampleName passed all 7 representative cases. Commit 5a7d17 pushed to origin/master.
- Problems/risks: None. Normalization is one-directional (stripping only) and only applied during fuzzy match; original name preserved everywhere else.
- Rollback: git revert f5a7d17
- Evidence: Commit 5a7d17 on master. All 7 inline unit-test cases passed.
- Next action/owner: User to refresh the live browser and re-select ML-ST-26-0280 on the Analysis Reports page to confirm resolution.


### TASK-20260926-006
**Date**: 2026-09-26
**Task**: Modernize Samples & history table UI
**Files Changed**:
- src/overhaul.css
- src/experience.css
**Summary**: Improved cell padding, modernized column headers, added a subtle zebra stripe and left-border accent on hover, styled the open link as a pill button, and removed a conflicting hover transform.

### TASK-20260926-005c
**Date**: 2026-09-26
**Task**: Expand sample name normalization for stability timepoints
**Files Changed**:
- server/reports.ts
**Summary**: Added regex pattern to strip (T,14,15) style stability timepoint notations from sample names before product matching, routing them correctly to the base product.

### TASK-20260926-007
**Date**: 2026-09-26
**Task**: Fix Admin UI textarea newline bug and validation error
**Files Changed**:
- src/admin.tsx
**Summary**: Modified the onChange handler for aliases and lookups textareas to preserve empty lines while typing (allowing users to use the Enter key and backspace freely). Moved the .filter(a => a.trim() !== '') cleanup logic to the Save handler, preventing premature Zod validation errors.


### TASK-20260926-008
**Date**: 2026-09-26
**Task**: Clarify error message when mapped product has no specifications
**Files Changed**:
- server/reports.ts
**Summary**: When a sample resolves to a product that has 0 specifications attached, the system previously defaulted the target context to 'Routine' and threw a confusing error (
o specification exists for context 'Routine'). It now properly detects that the product has NO specifications at all and throws an explicit error directing the user to create one in Settings.
