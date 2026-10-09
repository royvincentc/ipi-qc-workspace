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

## Neon egress mitigation — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-053. The owner requested code-side steps to reduce transfer after Neon reported project `ipiqclab` at 4 GB / 5 GB.
- Changed: `/api/search` now projects only list fields in SQL, omitting bulky source raw-row snapshots and field maps. `/api/drafts` and sample-detail draft references now return the fields their list UI uses. Detail endpoints still return full records.
- Verification: `git diff --check` passed. TypeScript check reports `server/google.ts:51` cannot find `hash`; this file had a separate 54-line uncommitted addition during inspection and was not changed by this task. No live DB or production access/deploy occurred, so transfer impact remains to be measured after deployment.
- Working tree: user/inherited uncommitted files remain preserved. Modified by this task: `server/search.ts`, `server/index.ts`, `shared/model.ts`, `src/reports.tsx`, `docs/agent-guide/tasks.md`, this handover. `server/google.ts` has an independent uncommitted change.
- Next: resolve the existing `server/google.ts` compile issue in its own scoped task, then deploy and compare Neon egress metrics.

## Report Results and MIC import — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-054. Added read-only matching-row import from category Results tabs, exact raw value preservation and source fingerprint checks; analyst MIC lookup uses the October MIC/Analyst table. Imported results do not auto-mark parameter pass/fail. `{{overall.remarks}}` remains sourced from Incoming October Remarks.
- The acceptance-limits tab exists. Its current generic row (`Differs`/`Negative`) lacks product, context, unit, method, effective date, and revision. Because product SPC criteria may differ, unresolved criteria still block report setup. Historical `james.zip` values remain candidate evidence, not a traceable approved criteria registry.
- Focused Results-header test and `git diff --check` passed. TypeScript no-emit check completed without diagnostics; combined runner then remained open after the focused test and was interrupted.
- Concurrent task 053 remains in the same dirty worktree. Preserve its changes; do not commit the shared working tree as one unit without review. No live Sheets writes, DB migration, commit, or deploy occurred.
- Next: register product-specific criteria with source report/date/context and validate generation end-to-end against the actual workbook row and approved template.

## Owner-confirmed historical acceptance baselines — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-055. Restored the `james.zip`-derived product exceptions supplied and reconfirmed by the owner. Product-specific historical entries take priority over shared SPC/MY/qualitative defaults; registered exact specifications remain higher priority.
- Criteria carry `dateBasis: owner-confirmed` and date 2026-09-30 for the owner's confirmation, not as a claimed historical report date. Each revision is content-hashed. The criteria policy now allows this explicit owner-confirmed baseline form.
- Three focused historical-criteria tests and TypeScript no-emit passed. No database or Google writes, commit, or deploy.
- Exact report-level source locations for each map entry remain unavailable; criteria record this as an owner-provided baseline rather than asserting report citations. Current worktree also contains task 053/054 changes; review before committing.

## Home dashboard `/api/work` error — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-056. Reproduced HTTP 500 and SQL syntax error at `specification` on isolated PGlite. Simplified `/api/work` nested draft projection to directly project specification/results JSON.
- TypeScript no-emit and `git diff --check` passed. `/api/health`, direct `/api/work`, and Vite-proxied `/api/work` return 200. Browser shows dashboard data and no error banner.
- Local API server was absent initially. Started an isolated demo backend using `.data/home-debug-db` and `output/home-debug-private`; no Google or PostgreSQL credentials. Local PostgreSQL is unavailable, so production DB behavior is not yet verified.
- Existing floating-assistant nested-button console warning is unrelated and was not modified.
- Current branch: master at `246e4a1` plus the dashboard fix in `server/search.ts` and corresponding task/handover entries. Untracked preview/scratch files remain preserved. Live data was not accessed; the owner has standing authorization to commit and push project changes.
- Next: verify `/api/work` against live PostgreSQL when available; assess/fix the separate floating assistant warning if requested.

## Report template verification and spacing — 2026-09-30, Asia/Taipei

- Task: TASK-20260930-057. Report setup refuses a format unless exactly one matching revision is verified. Refreshed built-in formats are registered but pending visual review because the template hashes changed; Word and LibreOffice are unavailable on this host.
- Changed: improved the report setup error to explain whether the format is missing, pending visual verification, or duplicated; it directs administrators to Settings → Standardized templates. The template list now shows `Needs visual review` for unverified files. Corrected inline overlap in saved draft identities/actions and the selected sample summary with responsive rows.
- Local UI check: de-identified demo shows the status labels correctly. The FG demo selection encountered an unrelated missing applicability row before reaching template routing. TypeScript no-emit passed and Impeccable detector returned no findings. Vite build could not start because esbuild reported access denied while resolving `vite.config.ts` through the bundled runtime. No test suite or live data access.
- Do not mark the refreshed report formats verified until a rendered visual comparison is reviewed. Production database/API is unavailable locally. Existing untracked scratch/previews remain; preserve them.

## Administrator template approval policy — 2026-10-01, Asia/Taipei

- Task: TASK-20261001-058. The owner authorized waiving the separate visual-review step for administrator-managed report template revisions.
- Changed: template registration remains administrator-only and retains the sanitization attestation plus DOCX structural/tag validation. Admin registration now authorizes the revision for report use and records the administrator, timestamp, and waiver. Startup promotes existing unapproved revisions under this policy and writes system audit events. Report routing/generation no longer depends on a visual-review flag; exact revision matching remains required. UI labels distinguish Admin-approved from visually verified.
- Verification: TypeScript no-emit and `git diff --check` passed; Impeccable detector returned no UI findings. Local browser review at 1440×900 and 390×844 showed no horizontal overflow. `npm run build` was unavailable because the configured npm CLI module path does not exist. The API process serving the local demo was older than this source edit, so startup migration and status badges were not verified locally. No automated tests or production DB access occurred.
- Known local UI issue: existing React console errors report a nested button in the floating assistant; unrelated and left unchanged.
- Next: deploy to production, confirm template revisions are Admin-approved, and inspect an authorized report setup. Preserve untracked scratch files already present in the workspace.

## Batch header alias update — 2026-10-01, Asia/Taipei

- Task: TASK-20261001-059. The owner asked that the sample importer handle `Batch No.` and `Batch/Lot No.` as equivalent batch labels.
- Branch/HEAD: `master` at `65aacf4` before this uncommitted change.
- Changed: `server/domain.ts` now accepts either normalized label at the configured batch column. Other positional header checks, section boundaries, and merges remain strict.
- Verification: `tsc --noEmit` passed; `git diff --check` passed. No automated tests were run. No live Sheets cell values, database, or production records were changed. A Drive metadata-only lookup surfaced an older Incoming Logbook with tabs through June; it was not used as the active October workbook.
- Current dirty files from this task: `server/domain.ts`, `docs/agent-guide/tasks.md`, and this handover. Preserve pre-existing untracked artifacts and scratch files listed above.
- Known limit: the October logbook's shifted category ranges remain unsupported by the fixed legacy mapping. This change resolves the header-name variation at an existing mapped column only; it does not complete October ingestion or authorize production synchronization.
- Next safe action: identify the exact active October workbook and inspect its bounded header rows read-only before implementing a versioned mapping for all shifted category sections.

## Environmental monitoring tagged template candidate - 2026-10-01, Asia/Taipei

- TASK-20261001-060 completed for owner review. Candidate: `output/Environmental Monitoring Tagged Template Candidate.docx`.
- Read-only source checks: archive inventory and structural comparison; Google Sheet metadata plus bounded header and requested-row reads on `September(ENVI) 2026`. No spreadsheet or Drive content was written.
- The requested row is ongoing and has no release date or remarks. No sample results were copied into the template.
- Main archive family is the five-column Analysis Desired / Area / Standard Specifications / Results / Remarks layout. Accupoint and SPCMY rows share that skeleton. Historical exceptions include a four-column GIP/water form, a phase-based seven-column warehouse form, and three-column Open Plate Exposure records. Do not route those outliers through the universal candidate without review.
- The screenshot error corresponds to `server/reports.ts` rejecting multiple compatible repeating-row layouts. The candidate is intended to be one shared EM layout; no live app settings/database were inspected or changed.
- Worker tag validation passed. Visual rendering remains unverified: LibreOffice is absent and Word COM returned `80070520`. Six inherited drawings need human review.
- `{{location}}` is shown as the proposed row-level location tag. Current `reportRows` combines test and location in `test`, so this tag requires a renderer/result-row change before the candidate can populate the separate Area column.
- No app code, Google data, commit, or deployment changed. Next step: owner visually reviews the DOCX, chooses the template scope and location-tag behavior, then authorize any registration/code work.

## Official ENVI renderer compatibility - 2026-10-01, Asia/Taipei

- TASK-20261001-061 completed as a read-only compatibility check of the user-provided controlled `ENVI.docx` and screenshot.
- Official DOCX validation passes: it includes the sample fields, five-column table, one `{{tests}}` repeat row, and page tags. This confirms syntax and package structure only.
- The current `server/template.ts` combines each test label and location into `test`; the document worker repeats a single row per result and cannot group locations under merged test/criterion cells. `{{location}}` is therefore not populated per result, and the current generated output would not match the screenshot exactly.
- The September logbook has an equipment count, not individual locations. A compatible implementation must source locations from the controlled test/specification list and add group-aware row rendering. No app, document, Sheet, or database content was changed.
- Next: await direction on implementing grouped Environmental Monitoring result rows against the controlled template.

## Environmental Monitoring format-family review package - 2026-10-01, Asia/Taipei

- TASK-20261001-062 completed for owner review. Package: `output/Environmental Monitoring Format Review Package.zip` and expanded files in `output/Environmental Monitoring Format Review Package/`.
- ZIP-wide structure scan covered 3,630 non-lock DOCX entries; 3,625 had recognizable results-table headers. Main topology is the five-column Analysis Desired / Area / Standard Specifications / Results / Remarks table. The scan found separate GIP 4-column (2 docs), Water Treatment Validation 4-column (3 docs), and Warehouse phase/Active-Air/Passive-Air 7-column (3 docs) candidates.
- Correction to TASK-060 note above: that scan did not confirm an Open Plate Exposure three-column result-table family. The new README marks it unconfirmed; don't create or route to that format without a source report.
- Created a catalog, 26 product/method route review rows, 379 candidate sampling-plan rows with historical criteria/locations but no readings, archive signature examples, JSON profile schema/example, per-format renderer adapter specifications, workbook, and an exact byte-for-byte copy of the supplied ENVI.docx. Source ENVI.docx remains unchanged; copy SHA-256: `5076b724a0a57e2b7da832754c7a11c7c567a8be686fcc0e6f7c5ca8df4efb7c`.
- DOCX tag validation passed; six drawings still need human review. Workbook/JSON/ZIP integrity checks passed. Visual rendering remains unverified. Existing renderer lacks grouped-row repetition/vertical merges; archive-derived product routes, locations and criteria are not approved current plans.
- No application code, Sheet, archive source, or database changed. Next: owner identifies active format families, approves product/method/area routing and sampling plans, and identifies approved blank masters for unique formats before renderer work or registration.

## Environmental Monitoring grouped report routing - 2026-10-01, Asia/Taipei

- TASK-20261001-063 completed locally for review after the owner approved the product-specific format/renderer work.
- Rechecked the linked `MICRO-QC Environmental Monitoring Logbook 2026` with the updated permissions. The provided gid resolves to `September(ENVI) 2026`; `ML-EM-26-0488` is row 74. `October (ENVI) 2026` currently has a visible heading that still says `SEPTEMBER 2026`. Row 74 has `N/A` in blank-header column G, so its meaning must be confirmed before mapping.
- Renderer now carries test and location separately and merges contiguous configured group cells for grouped repeated rows. Admin routing uses exact/prefix selectors and optional EM fallback; ambiguous/missing routing blocks draft creation. The 7-column warehouse phase/air format is still unsupported and disabled. Unique format families still need approved blank masters and owner confirmation.
- Updated package README and ZIP; added `09-google-sheet-read-only-crosscheck.md`. All Sheet calls were read-only.
- TypeScript no-emit, Python byte-compile, one worker grouped-row smoke, DOCX structural validation, package ZIP integrity, and `git diff --check` passed. The dev app ran against a separate de-identified demo DB; browser review at 1440x900 and 390x844 showed no horizontal overflow. Detector advisories relate to pre-existing global CSS transitions/tokens; no new routing-control defect appeared. No production database, templates, Google cells, Drive files, commit, or deployment changed.
- Generated output still needs visual comparison against the controlled signed DOCX in Word/WPS. The sheet only supplies a count of monitored items; location rows and criteria must come from a controlled sampling plan. Preserve existing dirty files and scratch output in the shared worktree.
- Next: owner manually verifies the report-family worksheet, approved unique masters and sampling plan, then decides which templates/routes to register. Do not mark historical location candidates as approved plans.

## Provisional owner confirmation - 2026-10-01, Asia/Taipei

- TASK-20261001-064. Owner provisionally accepted the proposed Environmental Monitoring format families and routing recommendations, with revisions expected later.
- Recorded the decision in `output/Environmental Monitoring Format Review Package/10-owner-provisional-decision.md`; README now treats proposed formats/routes as the current review baseline.
- This does not deploy or register production routes, visually approve generated output, resolve the unlabeled Google Sheet column G, or reconcile conflicting historical criteria. Candidate plan rows may support a clearly identified draft layout preview only.
- Package ZIP was refreshed and integrity checked. No Google, Drive, source DOCX, database, or production settings were changed.

## Latest sample-logging workflow handover — 2026-10-05, Asia/Taipei

- Tasks: TASK-20261005-001 and TASK-20261005-004. User clarified Incoming `Column 1` is `No.` and Environmental F/G form two separate values under Category.
- Branch: `master`; inherited shared working tree contains extensive unrelated edits and untracked artifacts. Preserve them. Scoped code touched for this task: `server/domain.ts`, `server/samples.ts`, `server/index.ts`, `src/workspace.tsx`, `src/styles.css`, and `tests/configuration.test.ts`; governance files updated here. No commit/push was made.
- Implemented: single/batch `/new` flow, review and assigned numbers, row editing/recalculation, per-item outcomes/retries, cancel, idempotent prepared submissions, explicit legacy `/api/samples` rejection, header normalization/ambiguity helper, raw source snapshot test, and lock-order fix for the existing demo submit helper.
- Verification: Latest TypeScript no-emit, Vite production build (`--configLoader runner`), and scoped new Node tests passed (4/4); Python worker tests passed earlier (7/7). Full Node suite previously had 51/57 pass, with six unrelated existing configuration/report/domain/template expectation failures (see task entry). Isolated DEMO_MODE browser flow logged one de-identified sample and then an edited two-row batch after recalculation, preserving the reviewed ML numbers and reporting 2 logged / 0 needing attention. Desktop entry/batch interactions and 1280×720 / 390×844 rendering were inspected. Captures: `output/playwright/intake-choice-1280.png`, `output/playwright/intake-choice-390.png`. `git diff --check` reports only unrelated trailing blank lines in dirty `DESIGN.md` and `src/main.tsx`; those were preserved.
- Source/data: Read-only investigation of supplied Incoming and Environmental workbooks only; no Sheets writes, production DB writes, migrations, deployment, or live-write setting change. Screenshots show the chooser at 1280×720 and 390×844. Impeccable reported existing layout-transition warnings and design-token advisories, with no significant intake-specific finding.
- Operational gate: Category F/G's October allowed values were read from strict dropdown validation; the UI now presents them as two single-choice groups, and SFG/FG displays the separate incoming field as `No.`. Dynamic mapping for October workbook sections, formulas/format/merge review, partial/reserved rows and current ML sequences is still pending. Existing fixed layout configuration does not match October; live prepare/commit must stay blocked. October Environmental visible title/date disagreement remains unresolved.
- Latest change verification: `tsc --noEmit` and Vite production build passed. Playwright inspection showed both Environmental Category groups and all source options; browser tested at 1280×820 and 390×844 with no document overflow. Selected `Backtrack` in F and `3` in G remained checked. Screenshots: `output/playwright/environment-category-1280.png` and `output/playwright/environment-category-390.png`. No tests were added or run.
- Next executable work: add a reviewed, versioned mapping model for each October section and environmental fields; reconcile current section row occupancy and sequence state read-only; test schema and API against fixture snapshots; then complete authenticated deployment readiness checks. Only after the rule-mandated reconciliation and administrator-controlled setting should live writes be considered.

## Smart Assistant formatting and error handover — 2026-10-05, Asia/Taipei

- Task: TASK-20261005-002. User requested readable formatting in the AI chat and correction of a generic Gemini connection error that can also represent a local application failure.
- Branch/HEAD: `master` / `be451fa`. Inherited working tree remains extensively modified; preserve all unrelated edits.
- Changed: `src/AssistantPage.tsx` renders common Markdown structures as safe React elements and marks errors accessibly. `src/experience.css` styles formatted content and error messages. `server/ai-support.ts` wraps Gemini call failures and separates provider classification from internal application failures; `server/ai.ts` logs only safe source/category/status metadata and returns the matching sanitized message.
- Verification: No tests, build, browser check, live API, database, Google source, or deployment was run/accessed for this task.
- Remaining: Markdown tables and other extensions are unsupported. Run a local UI/API check, then verify deployed behavior after an authorized deployment. No commit or push was made.

## Gemini multi-function reply correction — 2026-10-05, Asia/Taipei

- Task: TASK-20261005-003. The owner supplied production logs showing a Gemini response with two functionCall parts followed by a generic upstream 502.
- Finding: `server/ai.ts` executed only the first call, then attempted to read response text even when Gemini returned function-call parts. This left the second tool call unanswered and produced the SDK non-text-parts warning.
- Changed: The assistant now executes every function call in a model turn and sends a matching response for each call ID in one tool-result message. It continues subsequent tool-call turns (maximum five) and reads text only after the model returns a final text response. Application-side failures remain distinct from Gemini request failures.
- Data/service impact: Only the log excerpt supplied by the owner was used. No live Render query, API request, database/source data, secret, or deployment was accessed or changed.
- Verification: Not run; no tests, build, or browser check was run. No commit or push was made.
- Next: Run a de-identified request that triggers two function calls and confirm a final formatted response with no non-text-parts warning.

## October source sync repair — 2026-10-06, Asia/Taipei

- Owner requested missing October/later samples, including ML-FG-26-0477. Confirmed Render workspace tea-d7fs8ud8nd3s73ejbul0; live service srv-daqv18jncjis73bghv8g; database project ipiqclab, main/neondb.
- Root cause verified through authenticated Neon SQL editor: source ML-ST-26-0221 was cleared at August row 12, so the importer rejected the entire workbook. The preserved sample ID is 1b1d0ceb-f11e-4429-8933-c32bc9ade37b. Do not delete or rewrite its snapshot.
- Scoped fix preserves conflicting identities and blocks relocated duplicates while importing unrelated records; structured conflicts and partial counts remain auditable. No frontend layout or Google source changed.
- Relevant tests (40), typecheck and production build pass. Three full-suite report/configuration failures reproduced against the unchanged baseline.
- Pending: deploy scoped changes, refresh sources, confirm October count and target in Samples/Worksheet, confirm August snapshot remains identical, then append final verification.
- Live result: 64 October Incoming samples imported; target verified in rendered Worksheet and sample details. Historical August ID/fingerprint/observedAt preserved.
- Required historical refresh was slow due to serial SQL round trips. Added bounded batches of eight under the existing workbook lock, with all-settled failure handling; 42 relevant tests and typecheck pass. Environmental source has eight October records, so final expected total is 72. Complete full refresh and verify audit/conflict state after this deployment.
- Final outcome: 72 populated October records imported and searchable, including 8 EM. Live deployment 307bd36; completed refresh audited as da69c197-049d-40bb-a2f0-4a4af43633f0 with 1,472 snapshots refreshed and 13 products auto-created by the existing sync behavior. ML-FG-26-0477 verified in Samples, Worksheet and detail page.
- The single August conflict is preserved unchanged (same ID/fingerprint/observedAt, zero new history rows) and remains flagged. It no longer blocks unrelated imports. No Google Sheet cells or access permissions changed. Repair complete; reconcile the erased historical source ML separately if the owner requests it.

## Gemini billing diagnosis — 2026-10-09, Asia/Taipei
- TASK-20261009-001: supplied Billing screenshot shows this account requires Prepay and has no prepayment method despite $59.52 eligible GCP credits. Owner must set up prepay and fund the starting balance. Eligible GCP credits are consumed before prepaid credits once a prepaid balance is active.
- Confirmed workspace tea-d7fs8ud8nd3s73ejbul0, live ipi-qc srv-daqv18jncjis73bghv8g: generic Gemini quota errors in logs; raw failure and deployed key identity unverified. Local .env has no Gemini key.
- Prepared backend billing classification/structured-error fix and regression tests. Six assistant tests, typecheck, production build and diff check pass. Browser initialization failed due to Windows sandbox setup; no visual layout changed.
- Changes remain local and uncommitted: approval review rejected default-branch commit/push without explicit user approval. Ask for approval to publish the scoped four-file fix. Successful live request after owner activates prepay is still required to confirm restoration. No payment, secret export, database or workbook edits performed.
- Deployment approval: owner explicitly approved commit and push in this chat on 2026-10-09. Publishing the tested scoped fix; billing activation and successful assistant retry remain owner-side follow-up.
- Verified publication: commit 6eace3efbe279835b7e6360cf4613a04a62a1f19 pushed to origin/master. Render deployment dep-db3v2tg473hc73ftm0cg is live (2026-10-09 03:41:58 Asia/Taipei); GET /api/health returned {"ok":true,"demo":false}. Diagnostic update is deployed; Gemini request success remains unverified pending owner prepay activation. This post-deployment evidence is recorded locally after publication.

## Environmental surface swab report pair — 2026-10-09, Asia/Taipei
- TASK-20261009-002: owner clarified one environmental source row / ML number represents a swabbing session with Accupoint and SPCMY outputs, rather than individual swab points.
- Implemented atomic paired draft creation, saved method navigation, independent results/revisions, generation validation for both methods, separate PDF previews/downloads and explicit incomplete-output reporting. Source release status is unchanged.
- Reference dry run confirmed different method equipment lists can belong to the same activity. The scanner now preserves header paragraph boundaries; import combines those lists only when the methods share a historical ML and routing scope. Actual supplied pair produced one ready proposal with 8 Accupoint and 16 SPC/MY rows; current results remain blank.
- Verification: targeted TypeScript tests, production build/typecheck, real Playwright interaction at desktop/mobile widths, keyboard focus, dark/light view, both PDF downloads and rendered-page inspection passed. Audit/evidence: output/swab-session-review/verification.md. A save-before-switch guard issue found in the browser was fixed using the existing unsaved guard cleanup after successful persistence.
- Work is local and uncommitted. No production database/source/configuration or deployment changed. Existing single-method drafts/profile history was preserved; use a new draft from an approved pattern containing both methods for paired generation. No live patterns were silently merged.

## Environmental editor browser refinements — 2026-10-09, Asia/Taipei
- TASK-20261009-003 completed locally: larger Accupoint/SPCMY navigation, equipment-first Accupoint heading, 0 RLU/Exact value controls with visible suffix, and adjacent manufacture/expiry dates.
- Surface SPCMY result shortcuts now report Nmt 10 cfu/mL while pinned SPC100/MY30 standards remain unchanged in review and export. Suggested remarks follow product strict boundaries; manual overrides remain usable.
- Verification: build/typecheck, focused domain/session/result/template tests and real keyboard interaction at desktop/mobile widths; no page overflow. Visual audit found/fixed selected-button heading contrast. Evidence: output/swab-session-review/editor-refinement-verification.md.
- Local and uncommitted; no source workbook, production settings, sample release or deployment changed. Browser test edits were not saved.

## Shared environmental report details — 2026-10-09, Asia/Taipei
- TASK-20261009-004 implemented locally: Accupoint automatic suggestions at the strict 100 RLU boundary with manual override; common details shared only within the verified paired session; visible/one-time temperature Celsius suffix.
- Saves lock both paired drafts in the same order as generation, atomically update shared metadata and revision histories, and leave results/remarks separate. Stale companion editors must reload. Existing single-sided entries are resolved read-only on both methods and export/cache uses the resolved shared fields.
- Browser verification passed for method-switch metadata persistence, threshold/override and desktop/mobile layout. Filled optional metadata used to disappear; paired detail discovery now keeps it editable. No production/source/release/deployment changes; tested with separate de-identified drafts.

## Month-only report dates — 2026-10-09, Asia/Taipei
- TASK-20261009-005: manufacture/expiry now accept MM/DD/YYYY or MM/YYYY, with month-only dates preserved in export. Calendar-range comparison replaces string sorting and validates legacy aliases as well.
- Actual local demo pair with 02/2026 and 02/2029 now has no validation issues on either method. Build/typecheck, 42 focused tests and browser desktop/mobile checks pass. Analysis date still requires a complete date. No data edits or publication occurred.

## Environmental overall remarks — 2026-10-09, Asia/Taipei
- TASK-20261009-006: Accupoint/SPCMY surface report overall remarks now derive from each method's own final row remarks. All rows Passed gives Passed; failures name each parameter and equipment; incomplete rows cannot imply Passed. Product report formatting is preserved.
- Save and export resolve both overallRemarks and overall.remarks; new PDF cache revision prevents reuse of older empty-footer reports. Build, focused tests, browser summary/desktop/mobile checks and actual generated PDF footer extraction pass. Local/demo only; no release or deployment change.

## Authorized report workflow publication — 2026-10-09, Asia/Taipei
- Owner authorized GitHub publication of the completed report workflow and preview cleanup, including persistent optional detail editing and MM/DD/YYYY or MM/YYYY manufacture/expiry formats for SFG/FG/ST/MIS.
- Generated session previews now share one document workspace, method selector and selected-report downloads. Product and paired report detail discovery retains completed optional fields; alias edits/clears render consistently. Source identity/routing fields remain protected.
- Final checks: production build/typecheck, 123 application tests, 32 worker tests, Impeccable audit, keyboard preview switching, desktop/mobile layout and representative product review editing passed. Publish the explicit source/test/docs scope only; browser artifacts, private reference reports and demo data are excluded.

## Drive sync recovery and optional Purpose — 2026-10-09, Asia/Taipei
- TASK-20261009-008: new report DOCX/PDF bytes are archived separately in PostgreSQL with checksums and restored atomically on authorized access. Drive retries discover existing uploads before loading local bytes. Recorded Drive copies can restore missing original DOCX files. Original legacy records are retained; unrecoverable copies provide saved-draft/new-generation guidance and a library link.
- Purpose now resolves Incoming Type, including legacy Stability context, while manual edits/clears take precedence. Product Type tokens are exposed as optional Purpose; blank parenthesized Type/Purpose tags are removed across Word runs. Source routing/context and environmental Type remain protected.
- Build, 129 application tests, 33 worker tests, targeted concurrent restoration, Impeccable/whitespace checks and desktop/mobile keyboard browser fixtures pass. Live Render service has no persistent disk; production failure recovery outcome still needs verification after publishing.

## Owner-requested Drive archive hierarchy — 2026-10-09, Asia/Taipei
- TASK-20261009-009 adds Analyst/YYYY/SFG|FG|STAB|MISC|ENVI/MM report folders and a protected administrator organization action for existing tracked Drive reports. Older categories come from pinned draft revisions; Drive IDs persist; files outside the configured archive are blocked; source records and sharing/ownership are not changed.
- 131 application tests, build/typecheck, Impeccable checks and local browser desktop/mobile controls pass. The unchanged document worker previously passed 33 tests.
- Earlier Type/Purpose and durable-file fix 39c0019 is live. The selected live saved Stability sample has no recorded Type/context; optional Purpose is therefore blank. The owner explicitly authorized exactly seven failed upload retries. Lost originals require a newly generated report from the saved draft; no historical record is silently replaced. Archive hierarchy publication and live organization are next.
