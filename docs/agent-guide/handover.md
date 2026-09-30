# IPI QC Microbiology Workspace â€” Active Handover\n\n| Document control | Value |\n|---|---|\n| Document ID | IPI-AI-HANDOVER |\n| Revision | 1.0 |\n| Last updated | 2026-09-25, Asia/Manila |\n| Prepared by | Codex (GPT-6), zero-JavaScript cursor replacement |\n| Repository | `C:\Users\Roy\Documents\ChatGPT\IPI` |\n\nThis is the volatile transfer record. Update it whenever work pauses, finishes, changes direction, or transfers to another person/model. It supersedes older handoff notes as the current starting point; older files remain historical evidence and may contain inaccurate claims. Verify this file through [audit.md](audit.md), follow [goal.md](goal.md) and [rules.md](rules.md), and record all work in [tasks.md](tasks.md).\n\nDo not put secrets, private keys, tokens, full connection strings, sensitive live data, or unnecessary share links in this document.\n\n## Current objective\n\nMove the audited development application toward a controlled first release in which sample logging/lookup and standardized report generation are equally complete. The dashboard experience has received a complete responsive visual overhaul, and the production Gemini assistant history-order failure is repaired in code. The remaining release gates are credential rotation/deployment smoke testing, operational controls, controlled read-only import/reconciliation, and approved DOCX template/criteria decisions.\n\n**Current phase:** integration, control hardening, and release validation. TASK-20260925-019 configures `pg.Pool` to gracefully use SSL for remote connections, solving potential timeouts when connecting to Supabase or Neon.\n\n## Repository state at transfer\n\n- Branch: `master`\n- Final state: TASK-20260925-019 modified `server/db.ts` to add default SSL configuration for remote `DATABASE_URL` connections.\n- Working tree expected after finalization: `server/db.ts`, `docs/agent-guide/tasks.md`, and this handover are modified.\n- Governance files changed: `docs/agent-guide/tasks.md` and this handover.\n- No live-source data or database records changed.\n\n## What has been verified\n\n### Application corrections\n\n- Dashboard cards and activity are data-backed rather than fabricated schedules/progress.\n- Global search performs real record search.\n- Placeholder command-palette behavior and the broken `/calendar` route were removed.\n- Mobile navigation, phone overflow, theme (`light`/`dark`/`system`), and density behavior were repaired.\n- Specifications mapping uses the observed `RM/FP/AS` sheet.\n- Finished Goods validation accepts the observed historical merged title `Finished Goods` while retaining the configured `FINISHED` title rule.\n- A repeatable read-only Google connection verifier exists.\n- Connection test results are now cryptographically bound to a canonical fingerprint of the routing/layout configuration they validated. Relevant configuration changes invalidate the affected test, and Incoming/Environmental changes automatically disable writes.\n- Newly prepared report templates remove standalone `After ... incubation:` parameter paragraphs while preserving the remaining test labelâ€™s original formatting.\n\n- AI Assistant backend securely queries local samples and audit tables; returns 400 Fault if `GEMINI_API_KEY` is not present, avoiding obscuring errors through a generic 500 response.\n- Dashboard and application shell now use one coherent responsive visual layer with readable surfaces, consistent edges/spacing, functional dashboard filters, and retained data-backed metrics.\n- Desktop/phone motion includes route arrival, viewport reveal, loading/typing feedback, ambient graphics, a fine-pointer custom cursor, and the animated assistant pet â€œPip.â€ Coarse pointers and reduced-motion preferences receive appropriate fallbacks.\n- The right-side intelligence content moves below the dashboard at tablet/mobile widths rather than disappearing.\n- Assistant surfaces no longer depend on undefined color variables or an unstable draggable wrapper.\n- Production Render logs confirmed the assistant failure occurred before API-key authentication because Gemini history began with the UI's synthetic `model` greeting.\n- The server now removes only leading synthetic model messages, validates alternating history, uses the maintained `@google/genai` SDK and configurable current model, and exposes sanitized actionable error categories.\n- The fine-pointer custom cursor is now a static native CSS/SVG cursor with no JavaScript tracking, animation frame, React component, dataset mutation, or moving DOM layer. Editable fields retain the native text cursor, and unsupported browsers fall back to their standard zero-lag cursors.\n- Report preparation now resolves the selected logger sample's managed product/alias, exact testing context, QC Micro Products Specifications checklist row, dated criteria, and compatible verified layout automatically. Repeating-row layouts derive their parameter table from checklist applicability. Safe template metadata can be prefilled from the pinned sample snapshot, while actual results and controlled dates/personnel/approval fields remain blank/manual. Generated reports expose both audited PDF and DOCX downloads.\n\n### Automated and browser checks\n\n- 38 Node/domain tests passed.\n- 7 Python DOCX worker tests passed.\n- TypeScript typecheck passed.\n- Vite production build passed.\n- Desktop and phone browser checks confirmed working search and Settings, no console warnings/errors observed, and no phone page-level horizontal overflow.\n- The current archive-based sample PDF was rendered and visually compared with its reference layout. The incubation prefixes are absent; `Celeste P. Yandug â€” Assistant Head, Microbiology Laboratory` is present; PAGE and NUMPAGES fields remain automatic. The template still requires IPI approval and human review of inherited drawing objects.\n\nAfter TASK-20260925-012, the same 38 TypeScript/domain tests and 7 Python worker tests passed. TypeScript typecheck and the Vite production build passed. Final browser checks used a fresh session on the de-identified demo workspace at 390Ã—844, 1024Ã—768, and desktop/default viewports: no page overflow, filters and mobile navigation worked, Pip opened/closed, tablet rail content remained available, and the console contained no warnings or errors. The main bundle was `453.95 kB` (`136.53 kB` gzip).\n\nAfter TASK-20260925-013, all 41 Node/domain tests passed, including three assistant-history/error regressions. TypeScript typecheck and the Vite production build passed; `npm audit` reported zero vulnerabilities. The live Gemini endpoint was not invoked during verification because the screenshot exposed the configured key and it must be rotated first.\n\nAfter TASK-20260925-014, all 41 Node/domain tests, TypeScript typecheck, and the Vite production build passed. The cursor continues to respect reduced-motion and coarse-pointer fallbacks; its subjective feel should be confirmed on the project owner's live desktop after deployment.\n\nTASK-20260925-015 supersedes TASK-20260925-014's animated cursor after the project owner still perceived lag. All 41 Node/domain tests, TypeScript typecheck, and the Vite production build passed. The native cursor assets were included in the production output, and the main bundle decreased to `452.86 kB` (`136.23 kB` gzip).\n\nAfter TASK-20260925-017, all 41 Node/domain tests and 7 Python DOCX worker tests passed; TypeScript typecheck and the Vite production build passed (`452.56 kB` / `136.19 kB` gzip main JS). A fresh de-identified browser flow automatically resolved the demo Finished Goods sample to SPC and Molds/Yeast plus the verified two-test layout, then created a draft with exactly two blank manual result rows. No live source or production environment was accessed.\n\nThese results describe the audited working tree on 2026-09-25. Rerun relevant checks after further edits; do not carry them forward as permanent proof.\n\n### Google connections\n\nAuthentication succeeded using the shared service-account identity `sample-logger-backend@gen-lang-client-0151849181.iam.gserviceaccount.com`.\n\n- Incoming Logbook: passed 9 monthly tabs and 54 category-section layouts.\n- Product Specifications: passed 2 tabs and 92 product rows.\n- Environmental Monitoring: the original audit passed 8 of 9 monthly tabs and blocked `JUNE (ENVI) 2026`. TASK-20260925-007 later records that IPI corrected the title and a read-only rerun passed all tabs.\n- No Google cells or permissions were changed.\n\nThe successful rerun in TASK-20260925-007 was not independently repeated during the dashboard-only task. Reverify before relying on it for an operational gate; do not weaken validation globally.\n\n## Known environment and readiness limits\n\n- Links entered through the current Settings flow are in the local/demo PGlite environment, not a confirmed production database.\n- The configured live PostgreSQL target is a placeholder/unreachable in the inspected environment.\n- Google OAuth client configuration, initial admin allowlist, and deploy-time service-account credential configuration are not complete in the application environment.\n- Google write operations remain disabled and are not authorized by the successful read-only test.\n- Historical reports provide useful criteria/layout evidence, but approved blank templates and a formally controlled criteria source/process still need IPI decisions. Automatic report setup now reports this as a specific blocking configuration error rather than exposing empty internal selectors.\n- Existing `docs/HANDOFF.md` and `docs/HANDOFF_GEMINI_TO_CHATGPT.md` contain claims that conflict with repository evidence. Preserve them as history; do not treat them as authority.\n- On this machine, the ordinary global `npm` launcher is unusable because its expected global npm CLI path is missing. Use the bundled Node/Python runtimes and direct local package binaries. A bundled `pnpm` attempt tried to relocate npm-managed dependencies before its network request failed; the packages were restored from `node_modules/.ignored`. Do not run `pnpm` against this existing dependency tree without an intentional package-manager migration.\n- The Gemini key displayed in the project-owner screenshot is compromised by disclosure. Revoke it in Google AI Studio, replace `GEMINI_API_KEY` in the active Render service, and redeploy before any live assistant smoke test.\n\n## Decisions that must be preserved\n\n- Log only to todayâ€™s laboratory month; never fill earlier months or earlier row gaps.\n- Continue after the last occupied or explicitly reserved row in the current category section.\n- ML-only rows are placeholders, not occupied samples. Exact `RESERVED` in Remarks reserves a row; partial rows are unavailable.\n- Incoming sections are independent even when unrelated samples share a physical worksheet row.\n- Validate mappings before every read/write; block on mismatch.\n- Actual results remain manual. Historical reports never supply actual results.\n- No automatic release or automatic pass/fail in the current release.\n- Preserve standardized DOCX format; remove `after ## hrs incubation` from parameter labels.\n- â€œNoted byâ€ remains `Celeste P. Yandug â€” Assistant Head, Microbiology Laboratory`.\n- Use continuous automatic `Page X of Y`; keep the separate logbook/page reference editable.\n- Live credentials remain server-side, and development remains de-identified unless specifically authorized.\n\n## Exact next actions\n\n1. Revoke and replace the exposed Gemini key in the active Render service, confirm the TASK-20260925-013 deployment is live, and run one de-identified authenticated assistant smoke test. Do not enable Google writes as part of that check.\n2. Before an operational release gate, reproduce TASK-20260925-007â€™s recorded all-tabs-passing read-only connection verification; this dashboard task did not open live sources.\n3. Confirm the real PostgreSQL environment, Google OAuth client, administrator allowlist, and server-side service-account secret on the selected deployment platform. Test authentication and role enforcement without exposing credentials.\n4. Run a controlled read-only initial import; reconcile duplicate ML records, direct edits, color-only reservations, and numbering state. Produce a review report before enabling writes.\n5. Register each real product name/alias and exact logger testing context, designate the authoritative dated criteria process, and designate one approved repeating-row or uniquely compatible report layout per category.\n6. Exercise the full de-identified sample â†’ automatic checklist parameters/layout â†’ manual results â†’ review â†’ PDF/DOCX workflow on desktop and phone, then visually compare both outputs against the approved format.\n7. Enabling live Google writes remains a separate controlled decision after all required controls pass.\n\n## Starting checklist for the next agent\n\n- [ ] Read `prompt.md`, then the five governance files it identifies in the stated order.\n- [ ] Run `git status`, inspect HEAD/history, and review every diff before editing.\n- [ ] Reproduce relevant tests rather than trusting the counts above.\n- [ ] Confirm the active environment and ensure live writes are disabled.\n- [ ] Read the user request and identify authorization boundaries.\n- [ ] Add/update a `tasks.md` entry before claiming a material change complete.\n- [ ] Update this file with current state, verification, blockers, and next actions before stopping.\n\n## Handover update template\n\nWhen transferring work, replace the volatile sections above while preserving verified decisions. Include:\n\n```markdown\n- Timestamp/timezone and agent identity\n- User-authorized objective\n- Branch, HEAD, full dirty-file inventory\n- Completed changes with task IDs\n- Migrations/data/source access and whether any writes occurred\n- Exact test commands and results\n- Browser/document visual evidence\n- Unresolved findings and severity\n- Decisions made and decisions still requiring an owner\n- Safe rollback/recovery notes\n- Ordered next actions with the first executable step\n```\n\nIf work is complete, say what acceptance evidence proves completion and list any operational or validation work that remains. â€œCompleteâ€ must never mean only that code was generated.\n\n## Current State (2026-09-28)
- **Phase**: Post-Deployment Operational Optimization & Template Refinement
- **Recent work**: 
  - Baked the user's official custom DOCX template into the codebase as a base64 string (`custom-template.b64.ts`) and configured the system to auto-seed it on startup while automatically deleting the conflicting default layout to resolve ambiguity errors (TASK-20260928-023).
  - Investigated and resolved a massive database bandwidth leak causing Neon usage limits to trigger. Optimized the `syncSources` background loop to only query 100-byte row fingerprints (instead of full JSON blobs) and completely skip database writes for unchanged Google Sheet rows, cutting network egress by 99% (TASK-20260928-024).
  - Fixed a crash related to Render's ephemeral filesystem where generated report previews would throw 409 errors if the server restarted (wiping the disk) while the DB record persisted. The system now intelligently auto-regenerates missing preview files (TASK-20260928-025).
  - Implemented an administrative feature to clear test drafts. Added a `DELETE /api/drafts/:id` endpoint and a "Clear all" button to the UI to purge drafts and their generated preview files from both the DB and disk (TASK-20260928-026).
  - Changed the default filename format for generated document downloads to `[batch] - [product].docx` instead of the internal ML-draft ID (TASK-20260928-027).
  - Expanded the report templating engine to map the custom tags `{{d.release}}` (mm/dd/yyyy), `{{t.release}}`, and `{{logbook}}`. Configured the engine to automatically expand test abbreviations (SPC, MY) into their full formal names on the generated reports (TASK-20260928-028).
  - Reduced the Miss Minutes AI assistant auto-hide timeout from 5 minutes to 1 minute (TASK-20260928-029).

## Next Actions
1. Await confirmation from the user that the generated PDF/DOCX templates are perfectly aligned with their organizational standards now that the date/time tags and test abbreviation spelling expansions are active.
2. Monitor database bandwidth to ensure the background sync optimization effectively halts the Neon egress limit warnings.
3. Review the approved `DESIGN.md` and continue the scoped implementation only after visual review. Preserve the current dashboard's animated hero, atmospheric background, motion graphics, and assistant personality while keeping operational work visually primary.

## Latest design audit handover — 2026-09-28, Asia/Taipei

- User-authorized objective: create the approved UI design contract after a read-only baseline audit.
- Branch/HEAD: `master`; existing uncommitted user files remain untouched.
- New design artifacts: `DESIGN.md` and `.impeccable/design.json`.
- Verification: de-identified demo app rendered and inspected at 1440×900, 1280×800, 1024×768, 768×1024, and 390×844; dashboard search/filter and intake category interaction verified; design sidecar JSON parsed successfully.
- Browser evidence: at 390px, document width measured 405px with horizontal spill; no live Google or production source was accessed.
- Current phase: approved design direction; implementation is intentionally paused pending the next user request.
- Latest direction revision: cinematic motion is explicitly retained with a motion budget, reduced-motion fallback, and no overlap with sample actions or data-entry controls. See `design-reference-dashboard-motion.png`.

## Latest implementation refinement — 2026-09-28, Asia/Taipei

- User-authorized objective: proceed with a small refinement pass based on the current dashboard screenshot, not a wholesale redesign.
- Task: TASK-20260928-032.
- Changed: safe activity timestamp rendering in `src/workspace.tsx`; mobile table width containment and phone assistant sizing in `src/experience.css` and `src/overhaul.css`.
- Verification: direct TypeScript typecheck passed; de-identified demo browser checks at 390×844 and 1440×900 found no page overflow or `Invalid Date`; dashboard search filtering still works.
- No live source, Google write, or production environment was accessed.

## Latest Settings filter refinement — 2026-09-28, Asia/Taipei

- Task: TASK-20260928-036.
- Changed: gave the Settings “Find a setting…” control its own surface instead of inheriting competing generic search/input backgrounds. It now uses a single recessed field, stable icon/input alignment, and a visible focus ring.
- Verification: TypeScript typecheck passed; browser inspection confirmed the control’s rendered bounds and no document overflow. Impeccable detector returned 0 anti-patterns for the changed Settings files.
- No live source, Google write, or production environment was accessed.

## Latest Settings browser refinement — 2026-09-28, Asia/Taipei

- Task: TASK-20260928-035.
- Changed: replaced the compressed shared Settings entity list with a roomy record browser for Sample types, Products / materials, Tests, and Lookup values. Rows now show identity, contextual metadata, status, selected state, and a clear relationship to the editor pane.
- Verification: TypeScript typecheck passed; browser checks at 1224×600 and 390×844 confirmed the new layout and no document overflow. Impeccable detector returned 0 anti-patterns for `src/admin.tsx` and `src/settings-layout.css`.
- No live source, Google write, or production environment was accessed.

## Latest browser-comment refinement — 2026-09-28, Asia/Taipei

- Task: TASK-20260928-034.
- Changed: search/lookup controls now share a recessed console treatment; the assistant page uses the floating Miss Minutes asset and has local conversation history; topbar date/time stays on one line; settings entity rows have more breathing room; and the sidebar collapse control moved to the sidebar header with explicit collapse/expand labels.
- Confirmed: the floating assistant speech bubble timeout is 60 seconds (`60000ms`).
- Verification: TypeScript typecheck passed. Browser checks covered `/assistant`, `/samples`, `/reports`, and `/settings` at desktop and 390×844 mobile widths; no document overflow was observed. Impeccable completed with four remaining legacy/layout findings and advisory token notes.
- No live source, Google write, or production environment was accessed.
- Next safe step: review the refined dashboard visually, then decide whether to address remaining table ergonomics or move to another screen.

## Latest comment implementation — 2026-09-28, Asia/Taipei

- Task: TASK-20260928-037.
- Changed: the command palette search field now has one deliberate recessed surface and focus treatment; native dialogs now use a restrained modal surface and backdrop; assistant history no longer saves greeting-only sessions, removes stale empty records, supports deletion, and requests a concise AI title with a deterministic fallback.
- Google Drive: existing library synchronization remains read-only and server-authorized. Automatic report backup is not enabled; enabling Drive writes requires a separate approved destination, scope, audit, failure/retry, and deployment configuration.
- Verification: TypeScript typecheck and Vite production build passed. Browser checks confirmed empty assistant drafts are not listed, real requests create a titled record with a delete affordance, and the command palette renders as a single inset field. Impeccable reported only two pre-existing thick side-tab rules in the legacy experience stylesheet plus advisory token notes.
- No live source or Google write was accessed.

## Latest cursor refinement — 2026-09-28, Asia/Taipei

- Task: TASK-20260928-038.
- Changed: retained the existing static cursor architecture while updating the pointer artwork toward the user’s white/blue reference and adding a lightweight VFX halo/trail. Action controls, text fields, and press states receive distinct feedback; coarse pointers and reduced-motion users are not affected.
- Verification: TypeScript typecheck, Vite production build, and browser inspection passed. Impeccable found only existing legacy side-tab warnings and advisory token notes.
- No live source or Google write was accessed.

## Latest sidebar and motion refinement — 2026-09-28, Asia/Taipei

- Task: TASK-20260928-039.
- Changed: the collapsed sidebar control now occupies a separate top utility zone, leaving the animated laboratory mark below it. Logo motion is transform-only and disabled for reduced-motion users. Ambient rendering is paint-contained and route reveal registration is frame-coalesced.
- Verification: TypeScript typecheck, Vite production build, and Impeccable detection passed. No live source or Google write was accessed.

## Latest report-generation repair — 2026-09-29, Asia/Manila

- Task: TASK-20260929-041.
- User-authorized objective: fix nonfunctional special tags in the uploaded report template and ensure Omega Pain Killer Liniment - Pro resolves its five specification parameters rather than only SPC.
- Changed: `server/reports.ts` now maps every special tag found in the uploaded custom template (`sample.released`, `date.mfd`, `exp.date`, `fill.vol`, `requested.by`, and `logbook`) from manual report details or pinned sample metadata as appropriate. `sample.released` is the report-generation timestamp, not an inferred laboratory result. Product/applicability resolution now favors a more specific product name and only accepts positive best checklist-row matches; equal candidates remain visible to the existing ambiguity block.
- Verification: focused tag/Omega regression tests passed; 7 DOCX-worker tests passed; TypeScript typecheck and Vite production build passed; diff check passed. The full Node test runner stopped after its initial eight passing tests in this host environment; use the focused regressions as the direct evidence for this repair.
- Data/source access: no live Google or production database access; no source/template/laboratory records changed.
- Current dirty inventory: `server/reports.ts`, `tests/configuration.test.ts`, `docs/agent-guide/tasks.md`, and this handover are this task’s changes. Existing untracked `.agents/`, `.impeccable/`, `fix.py`, `output/`, `patch.py`, `patch.txt`, `patch2.py`, `patch_docs.py`, `query.ts`, and `upload_template.ts` remain preserved and untouched.
- Next safe action: commit and push the focused fix, then generate an Omega Pain Killer Liniment - Pro report in the live application and review the rendered PDF/DOCX for five rows and populated template metadata.

## Latest revised-template replacement — 2026-09-29, Asia/Manila

- Task: TASK-20260929-042.
- User-authorized objective: replace the embedded custom report template with the newly uploaded format.
- Changed: `server/custom-template.b64.ts` now embeds the new upload. On startup, `server/index.ts` refreshes the existing `Roy Custom Template` database record with the new validated manifest and revision instead of keeping stale metadata. The deployed copy adds one space between adjacent `{{d.release}}` and `{{t.release}}` tags, preventing the generated Date&Time Released value from running together; the original upload is untouched.
- New template tags: `analyst`, `criterion`, `d.release`, `date.mfd`, `exp.date`, `fill.vol`, `logbook`, `remarks`, `requested.by`, `sample.batch`, `sample.category`, `sample.ml`, `sample.name`, `sample.received`, `t.release`, `test`, `tests`, and `value`.
- Verification: worker validation found all 18 tags; a de-identified proof generated without unresolved placeholders and Word produced a non-empty one-page PDF. Focused report regressions, 7 DOCX-worker tests, TypeScript typecheck, and Vite production build passed. The host image viewer displayed a blank image after the final PDF re-render despite the successful Word PDF, so visually verify date/time spacing after deployment.
- Data/source access: no live Google or production database access; no laboratory record/source file changed.
- Current dirty inventory: `server/custom-template.b64.ts`, `server/index.ts`, `tests/configuration.test.ts`, `docs/agent-guide/tasks.md`, and this handover are this task’s changes. Existing untracked files remain preserved and untouched.
- Note: The uploaded template retains static `REMARKS: Passed` content. It is outside the requested tag migration but conflicts with the established no-automatic-pass/fail rule; it requires an owner-controlled template decision before operational use.
- Next safe action: commit, then request explicit approval before pushing to shared `master`/Render. After deployment, generate and visually inspect an authorized Omega Pain Killer Liniment - Pro report for five parameters and correctly spaced release date/time.

## Latest product-variant mapping repair — 2026-09-29, Asia/Manila

- Task: TASK-20260929-043.
- User-authorized objective: apply the stated Omega Liniment product-variant rules and repair Herbycin Syrup’s SPC-only resolution.
- Changed: report matching is now case-insensitive and rejects candidate products/checklist rows unless `Export`, `Pro`, and `Old Specs` agree. Fill volume remains a packaging variation. This distinguishes base/non-export, Export, Pro/New, and Pro Old Specs before fuzzy scoring. A regression confirms the Herbycin Syrup row resolves SPC, MY, S. aureus, E. coli, Salmonella, and Enterobacteriaceae rather than SPC alone.
- Verification: focused mapping regression, TypeScript typecheck, 7 DOCX worker tests, Vite production build, and diff check passed.
- Data/source access: owner-provided screenshot only; no live Google or production database access and no source records changed.
- Current dirty inventory: `server/reports.ts`, `tests/configuration.test.ts`, `docs/agent-guide/tasks.md`, and this handover are this task’s changes. Existing untracked files remain untouched.
- Next safe action: commit, then obtain explicit approval to push all pending report/template commits to shared `master`/Render. After deployment, exercise each Omega variant and Herbycin Syrup in live report setup.

## Latest Herbycin Syrup preview — 2026-09-29, Asia/Manila

- Task: TASK-20260929-044.
- User-authorized objective: produce a report example for Herbycin Syrup review.
- Changed: generated a local blank-result preview containing six requested parameter rows. Template render QA corrected spacing between split `d.release`/`t.release` runs and removed empty trailing body paragraphs that forced a blank second page. The current deployed template source embeds these presentation corrections; the uploaded source DOCX was preserved.
- Verification: generated DOCX had no unresolved tags; Word rendered a final one-page PDF; TypeScript typecheck, Vite production build, and 7 DOCX worker tests passed.
- Data/source access: de-identified local preview only; no live sources, database records, actual results, or criteria changed.
- Note: preview retains the uploaded template’s static `REMARKS: Passed` footer despite blank results. It is not an automatic laboratory conclusion and needs an owner-controlled template decision.
- Next safe action: provide the preview for owner review, then commit the embedded template correction. Push to shared master/Render still requires explicit approval.

## Latest table ergonomics refinement — 2026-09-28, Asia/Taipei

- Task: TASK-20260928-033.
- Changed: dashboard action links now use concise visible labels with explicit accessible names, a single visual arrow affordance, and keyboard-focused row highlighting.
- Verification: TypeScript typecheck passed; browser checks completed at 1280×800, 1024×768, 768×1024, and 390×844 with no document overflow or `Invalid Date` text.
- Impeccable detector completed. It reported two existing side-tab warnings in the legacy experience stylesheet plus advisory token notes; no new blocking finding was introduced by this refinement.
- No live source, Google write, or production environment was accessed.

## Latest October source and report-format update — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-045.
- Current objective: route reports to owner-selected formats and inspect the new October 2026 source layout.
- Confirmed October columns: sections SFG A:S, FG U:AN, Water AQ:BG, Raw Material BI:BZ, Product Stability CB:CS, Miscellaneous CU:DK; MIC/Analyst lookup DM:DN. Raw Material BP is Supplier, BQ is Requested by, BR is Page Number. New metadata includes Batch/Lot Size, Fill Vol./Wt., DATE MDF, EXP DATE, Requested by, Page Number, and Supplier.
- Implemented in working tree: category/supplier routing, manual SFG pass/fail route, token aliases, and `overall.remarks` summarizing only explicit analyst outcomes. The six uploaded DOCX files are embedded as candidates; they remain unverified until rendered visual comparison. Drafts pin the routed template record.
- Verification: TypeScript typecheck and `git diff --check` passed. Focused Node tests could not start (`uv_os_get_passwd returned ENOMEM`). DOCX renderer unavailable (LibreOffice missing; Word COM initialization failed). No rendered visual verification is claimed.
- Source/data access: October Sheet inspected read-only; no Google writes or production DB/source record changes. Original DOCX files were not edited.
- Material gap: Current importer reads through CW and uses legacy fixed section positions, so it does not support October's shifted blocks or map its new metadata. The DM:DN MIC lookup mapping is also unresolved. Do not claim October ingestion is automated.
- Dirty task files: `server/index.ts`, `server/reports.ts`, `shared/model.ts`, `src/reports.tsx`, `tests/configuration.test.ts`, `server/report-formats.b64.ts`, `docs/agent-guide/tasks.md`, and this handover. Preserve existing untracked artifacts (`.agents/`, `.impeccable/`, `fix.py`, `output/`, `patch.py`, `patch.txt`, `patch2.py`, `patch_docs.py`, `query.ts`, `upload_template.ts`).
- No deployment, commit, live write, or rendered report verification performed.
- Next safe actions: implement versioned October layout mapping without changing historic tabs; resolve MIC-to-analyst source rule; render and compare all six formats before enabling them; rerun focused/full checks and verify the report flow.

## Latest source-results clarification — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-046.
- Owner clarified `{{overall.remarks}}` comes from the incoming logbook `Remarks` column, not a computed summary. Updated `server/reports.ts` to populate it directly from the pinned sample source field, overriding any manual report-field value. Existing per-test manual outcomes still select SFG vs SFGQA.
- Owner confirmed the `{{mic}}` value should be looked up from October's MIC/Analyst table using the report analyst. October lookup is in DM:DN; implementation remains coupled to the pending October layout integration.
- Read-only inspection confirms Results workbook tabs for all five requested categories. They share columns A:I for record metadata (`ML Number` is D; `Remarks` is I) and test columns J:R for SPC through Coliform. A bounded scan of rows 1:1000 found no `ML-` data records yet, so actual value encoding and replicate/duplicate behavior cannot be validated. User clarification request is pending.
- QC Micro Products Specifications includes the expected `RM/FP/AS`, `Raw Materials`, and hidden criteria tabs. Visible applicability rows are product names plus TRUE/FALSE test flags. Do not replace or infer acceptance criteria from the Results workbook.
- Verification: TypeScript typecheck and `git diff --check` passed. Focused test runner was previously blocked by Node host error `uv_os_get_passwd returned ENOMEM`. All Google accesses in this update were metadata/bounded cell reads/searches; no write performed.
- October source layout remains unintegrated: legacy fixed section coordinates do not support shifted October category blocks or DM:DN MIC lookup. The six DOCX files remain unverified pending rendered visual comparison.
- Next actions: use user's row-layout answer and a populated row to implement read-only Results lookup; support October layout and MIC lookup; confirm configured QC specification URL; visually render/compare candidate formats; rerun tests.

## Latest product-applicability source update — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-047.
- Owner named product applicability tabs `RM/FP/AS` and `RAW` in the IPI Results workbook. Verified both tabs read-only: product name column A, applicability labels B:J, with SPC through Coliform flags; section markers without flag data are skipped.
- Implemented: new configuration seeds map Raw Material to `RAW` and other categories to `RM/FP/AS`; the specifications connection default points to the provided IPI Results URL. Startup version-migrates a saved RM tab value `Raw Materials` to `RAW` and the exact earlier specification workbook URL to IPI Results. Legacy `Raw Materials` tab mapping aliases to `RAW` only when that tab is present.
- Scope boundary: these tabs define applicable parameters, not acceptance criteria. Criteria stay in the separately controlled specification records/source. Results tabs are currently blank in searched rows, so actual result parsing is not yet implemented.
- Verification: TypeScript typecheck and `git diff --check` passed. No server restart or persistent app DB migration run; all Google calls were read-only.
- Outstanding: validate the new workbook with the app's specification connection test after restart; implement October tab geometry and MIC lookup; wait for populated IPI Results sample/row-format clarification; render-verify all candidate report formats.

## Commit and GitHub push — 2026-09-30, Asia/Taipei

- TASK-20260930-045 through TASK-20260930-047 were committed on `master` as `520909b` (`Add October report source and template routing`) and pushed successfully to `origin/master`.
- Tracked working tree is clean after the push. Existing unrelated untracked items remain preserved and were not included.
- No runtime deployment check was performed. TypeScript typecheck and diff check passed before commit; focused test runner remains blocked by the Node host `uv_os_get_passwd returned ENOMEM` issue.

## Latest sample-name suffix update — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-048.
- October 2026 live sheet re-scanned read-only: grid now extends to EV (154 columns). Suffix columns: SFG C, FG X, RM BM, Product Stability CG, Miscellaneous DA; Water has no suffix header. RM Supplier shifted to BS, Requested by BT, Page Number BU. Remarks columns are T/AP/BI/CC/CW/DP for SFG/FG/Water/RM/ST/MIS.
- Implemented: each of the six embedded DOCX formats uses `{{sample.name}} {{sample.name.suffix}}` (one literal space). Report field resolver sources suffix from `sample.fields.sampleNameSuffix` and pins sample name/suffix against manual overrides.
- Verification: six DOCX ZIP assets parse and contain the exact tag sequence; TypeScript typecheck and diff check pass. Rendering unavailable, so no visual verification is claimed.
- No live Sheet or original DOCX writes. October sample import still needs the shifted block geometry to bring suffix into source metadata.

## Latest report-format refresh — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-049.
- Owner refreshed seven format files. Embedded candidates are now named SFG, SFGQA, STAB, FG, MISC, RM, RMQA. Routing sends Product Stability (ST) to STAB.docx and Finished Goods (FG) to FG.docx. Other category/supplier routing remains as previously specified.
- October Product Stability `Type` header verified at CH. Report resolver supports `{{type}}` from the source field and blocks manual override. Source input mapping still awaits October section-layout support.
- All seven embedded DOCX packages passed worker token validation; `type` exists only on STAB, and suffix token exists on all. TypeScript typecheck and diff check passed. No rendered comparison possible on this host; formats remain unverified for operational release.
- Originals and Google sheets were read-only. No external writes or deployment performed.
- Next actions: map October section geometry including Type and suffix; validate format rendering; rerun report routing tests and deployed sample flow.

## Latest Product Stability template update — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-050.
- Owner supplied a revised `STAB.docx`. It preserves all prior tags and moves `{{type}}` into parentheses on its own line.
- Replaced the embedded STAB asset and regenerated the June stability tag-placement preview. Refreshed `output/IPI-tag-placement-previews.zip`.
- Updated source DOCX passes worker token validation; generated preview has no unresolved placeholders and carries Type `Actual` and MIC-17 from the October Analyst table.
- Visual render could not run because LibreOffice is unavailable on this Windows host. Six drawings still need a human Word layout review. The original DOCX was read only.
- Pending: inspect the stability preview in Word and confirm layout before commit.

## Latest report date and suffix display update — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-051.
- All seven embedded templates were checked: they use `{{d.release}}` for the release date and `{{t.release}}` for release time. Resolver maps these to a date and a time respectively.
- Source-backed received, manufacturing, and expiry date fields now normalize ISO or M/D/YYYY inputs to MM/DD/YYYY. Empty `sample.name.suffix` removes its surrounding parentheses during DOCX generation.
- Regenerated seven example DOCX previews and `output/IPI-tag-placement-previews.zip`; incomplete historical received date was cleared rather than guessed. Generated files have no unresolved tags or empty parenthesis pairs.
- LibreOffice is unavailable, so visual layout review remains outstanding. The test suite was not run.

## Raw Material example timestamp correction — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-052.
- Read July 2026 row 6 for ML-RM-26-0080 from the incoming logbook. Its received timestamp is `07/01/2026 @ 08:57 AM`, analyst Karen, with source Remarks `FAILED in SPC (Done OOS)`.
- Updated RM and RMQA previews and the archive with the source values; suffix parentheses remain hidden when blank. No Google Sheet write was made.
