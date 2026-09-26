# IPI QC Microbiology Workspace — Active Handover

| Document control | Value |
|---|---|
| Document ID | IPI-AI-HANDOVER |
| Revision | 1.0 |
| Last updated | 2026-09-25, Asia/Manila |
| Prepared by | Codex (GPT-6), zero-JavaScript cursor replacement |
| Repository | `C:\Users\Roy\Documents\ChatGPT\IPI` |

This is the volatile transfer record. Update it whenever work pauses, finishes, changes direction, or transfers to another person/model. It supersedes older handoff notes as the current starting point; older files remain historical evidence and may contain inaccurate claims. Verify this file through [audit.md](audit.md), follow [goal.md](goal.md) and [rules.md](rules.md), and record all work in [tasks.md](tasks.md).

Do not put secrets, private keys, tokens, full connection strings, sensitive live data, or unnecessary share links in this document.

## Current objective

Move the audited development application toward a controlled first release in which sample logging/lookup and standardized report generation are equally complete. The dashboard experience has received a complete responsive visual overhaul, and the production Gemini assistant history-order failure is repaired in code. The remaining release gates are credential rotation/deployment smoke testing, operational controls, controlled read-only import/reconciliation, and approved DOCX template/criteria decisions.

**Current phase:** integration, control hardening, and release validation. TASK-20260925-019 configures `pg.Pool` to gracefully use SSL for remote connections, solving potential timeouts when connecting to Supabase or Neon.

## Repository state at transfer

- Branch: `master`
- Final state: TASK-20260925-019 modified `server/db.ts` to add default SSL configuration for remote `DATABASE_URL` connections.
- Working tree expected after finalization: `server/db.ts`, `docs/agent-guide/tasks.md`, and this handover are modified.
- Governance files changed: `docs/agent-guide/tasks.md` and this handover.
- No live-source data or database records changed.

## What has been verified

### Application corrections

- Dashboard cards and activity are data-backed rather than fabricated schedules/progress.
- Global search performs real record search.
- Placeholder command-palette behavior and the broken `/calendar` route were removed.
- Mobile navigation, phone overflow, theme (`light`/`dark`/`system`), and density behavior were repaired.
- Specifications mapping uses the observed `RM/FP/AS` sheet.
- Finished Goods validation accepts the observed historical merged title `Finished Goods` while retaining the configured `FINISHED` title rule.
- A repeatable read-only Google connection verifier exists.
- Connection test results are now cryptographically bound to a canonical fingerprint of the routing/layout configuration they validated. Relevant configuration changes invalidate the affected test, and Incoming/Environmental changes automatically disable writes.
- Newly prepared report templates remove standalone `After ... incubation:` parameter paragraphs while preserving the remaining test label’s original formatting.

- AI Assistant backend securely queries local samples and audit tables; returns 400 Fault if `GEMINI_API_KEY` is not present, avoiding obscuring errors through a generic 500 response.
- Dashboard and application shell now use one coherent responsive visual layer with readable surfaces, consistent edges/spacing, functional dashboard filters, and retained data-backed metrics.
- Desktop/phone motion includes route arrival, viewport reveal, loading/typing feedback, ambient graphics, a fine-pointer custom cursor, and the animated assistant pet “Pip.” Coarse pointers and reduced-motion preferences receive appropriate fallbacks.
- The right-side intelligence content moves below the dashboard at tablet/mobile widths rather than disappearing.
- Assistant surfaces no longer depend on undefined color variables or an unstable draggable wrapper.
- Production Render logs confirmed the assistant failure occurred before API-key authentication because Gemini history began with the UI's synthetic `model` greeting.
- The server now removes only leading synthetic model messages, validates alternating history, uses the maintained `@google/genai` SDK and configurable current model, and exposes sanitized actionable error categories.
- The fine-pointer custom cursor is now a static native CSS/SVG cursor with no JavaScript tracking, animation frame, React component, dataset mutation, or moving DOM layer. Editable fields retain the native text cursor, and unsupported browsers fall back to their standard zero-lag cursors.
- Report preparation now resolves the selected logger sample's managed product/alias, exact testing context, QC Micro Products Specifications checklist row, dated criteria, and compatible verified layout automatically. Repeating-row layouts derive their parameter table from checklist applicability. Safe template metadata can be prefilled from the pinned sample snapshot, while actual results and controlled dates/personnel/approval fields remain blank/manual. Generated reports expose both audited PDF and DOCX downloads.

### Automated and browser checks

- 38 Node/domain tests passed.
- 7 Python DOCX worker tests passed.
- TypeScript typecheck passed.
- Vite production build passed.
- Desktop and phone browser checks confirmed working search and Settings, no console warnings/errors observed, and no phone page-level horizontal overflow.
- The current archive-based sample PDF was rendered and visually compared with its reference layout. The incubation prefixes are absent; `Celeste P. Yandug — Assistant Head, Microbiology Laboratory` is present; PAGE and NUMPAGES fields remain automatic. The template still requires IPI approval and human review of inherited drawing objects.

After TASK-20260925-012, the same 38 TypeScript/domain tests and 7 Python worker tests passed. TypeScript typecheck and the Vite production build passed. Final browser checks used a fresh session on the de-identified demo workspace at 390×844, 1024×768, and desktop/default viewports: no page overflow, filters and mobile navigation worked, Pip opened/closed, tablet rail content remained available, and the console contained no warnings or errors. The main bundle was `453.95 kB` (`136.53 kB` gzip).

After TASK-20260925-013, all 41 Node/domain tests passed, including three assistant-history/error regressions. TypeScript typecheck and the Vite production build passed; `npm audit` reported zero vulnerabilities. The live Gemini endpoint was not invoked during verification because the screenshot exposed the configured key and it must be rotated first.

After TASK-20260925-014, all 41 Node/domain tests, TypeScript typecheck, and the Vite production build passed. The cursor continues to respect reduced-motion and coarse-pointer fallbacks; its subjective feel should be confirmed on the project owner's live desktop after deployment.

TASK-20260925-015 supersedes TASK-20260925-014's animated cursor after the project owner still perceived lag. All 41 Node/domain tests, TypeScript typecheck, and the Vite production build passed. The native cursor assets were included in the production output, and the main bundle decreased to `452.86 kB` (`136.23 kB` gzip).

After TASK-20260925-017, all 41 Node/domain tests and 7 Python DOCX worker tests passed; TypeScript typecheck and the Vite production build passed (`452.56 kB` / `136.19 kB` gzip main JS). A fresh de-identified browser flow automatically resolved the demo Finished Goods sample to SPC and Molds/Yeast plus the verified two-test layout, then created a draft with exactly two blank manual result rows. No live source or production environment was accessed.

These results describe the audited working tree on 2026-09-25. Rerun relevant checks after further edits; do not carry them forward as permanent proof.

### Google connections

Authentication succeeded using the shared service-account identity `sample-logger-backend@gen-lang-client-0151849181.iam.gserviceaccount.com`.

- Incoming Logbook: passed 9 monthly tabs and 54 category-section layouts.
- Product Specifications: passed 2 tabs and 92 product rows.
- Environmental Monitoring: the original audit passed 8 of 9 monthly tabs and blocked `JUNE (ENVI) 2026`. TASK-20260925-007 later records that IPI corrected the title and a read-only rerun passed all tabs.
- No Google cells or permissions were changed.

The successful rerun in TASK-20260925-007 was not independently repeated during the dashboard-only task. Reverify before relying on it for an operational gate; do not weaken validation globally.

## Known environment and readiness limits

- Links entered through the current Settings flow are in the local/demo PGlite environment, not a confirmed production database.
- The configured live PostgreSQL target is a placeholder/unreachable in the inspected environment.
- Google OAuth client configuration, initial admin allowlist, and deploy-time service-account credential configuration are not complete in the application environment.
- Google write operations remain disabled and are not authorized by the successful read-only test.
- Historical reports provide useful criteria/layout evidence, but approved blank templates and a formally controlled criteria source/process still need IPI decisions. Automatic report setup now reports this as a specific blocking configuration error rather than exposing empty internal selectors.
- Existing `docs/HANDOFF.md` and `docs/HANDOFF_GEMINI_TO_CHATGPT.md` contain claims that conflict with repository evidence. Preserve them as history; do not treat them as authority.
- On this machine, the ordinary global `npm` launcher is unusable because its expected global npm CLI path is missing. Use the bundled Node/Python runtimes and direct local package binaries. A bundled `pnpm` attempt tried to relocate npm-managed dependencies before its network request failed; the packages were restored from `node_modules/.ignored`. Do not run `pnpm` against this existing dependency tree without an intentional package-manager migration.
- The Gemini key displayed in the project-owner screenshot is compromised by disclosure. Revoke it in Google AI Studio, replace `GEMINI_API_KEY` in the active Render service, and redeploy before any live assistant smoke test.

## Decisions that must be preserved

- Log only to today’s laboratory month; never fill earlier months or earlier row gaps.
- Continue after the last occupied or explicitly reserved row in the current category section.
- ML-only rows are placeholders, not occupied samples. Exact `RESERVED` in Remarks reserves a row; partial rows are unavailable.
- Incoming sections are independent even when unrelated samples share a physical worksheet row.
- Validate mappings before every read/write; block on mismatch.
- Actual results remain manual. Historical reports never supply actual results.
- No automatic release or automatic pass/fail in the current release.
- Preserve standardized DOCX format; remove `after ## hrs incubation` from parameter labels.
- “Noted by” remains `Celeste P. Yandug — Assistant Head, Microbiology Laboratory`.
- Use continuous automatic `Page X of Y`; keep the separate logbook/page reference editable.
- Live credentials remain server-side, and development remains de-identified unless specifically authorized.

## Exact next actions

1. Revoke and replace the exposed Gemini key in the active Render service, confirm the TASK-20260925-013 deployment is live, and run one de-identified authenticated assistant smoke test. Do not enable Google writes as part of that check.
2. Before an operational release gate, reproduce TASK-20260925-007’s recorded all-tabs-passing read-only connection verification; this dashboard task did not open live sources.
3. Confirm the real PostgreSQL environment, Google OAuth client, administrator allowlist, and server-side service-account secret on the selected deployment platform. Test authentication and role enforcement without exposing credentials.
4. Run a controlled read-only initial import; reconcile duplicate ML records, direct edits, color-only reservations, and numbering state. Produce a review report before enabling writes.
5. Register each real product name/alias and exact logger testing context, designate the authoritative dated criteria process, and designate one approved repeating-row or uniquely compatible report layout per category.
6. Exercise the full de-identified sample → automatic checklist parameters/layout → manual results → review → PDF/DOCX workflow on desktop and phone, then visually compare both outputs against the approved format.
7. Enabling live Google writes remains a separate controlled decision after all required controls pass.

## Starting checklist for the next agent

- [ ] Read `prompt.md`, then the five governance files it identifies in the stated order.
- [ ] Run `git status`, inspect HEAD/history, and review every diff before editing.
- [ ] Reproduce relevant tests rather than trusting the counts above.
- [ ] Confirm the active environment and ensure live writes are disabled.
- [ ] Read the user request and identify authorization boundaries.
- [ ] Add/update a `tasks.md` entry before claiming a material change complete.
- [ ] Update this file with current state, verification, blockers, and next actions before stopping.

## Handover update template

When transferring work, replace the volatile sections above while preserving verified decisions. Include:

```markdown
- Timestamp/timezone and agent identity
- User-authorized objective
- Branch, HEAD, full dirty-file inventory
- Completed changes with task IDs
- Migrations/data/source access and whether any writes occurred
- Exact test commands and results
- Browser/document visual evidence
- Unresolved findings and severity
- Decisions made and decisions still requiring an owner
- Safe rollback/recovery notes
- Ordered next actions with the first executable step
```

If work is complete, say what acceptance evidence proves completion and list any operational or validation work that remains. “Complete” must never mean only that code was generated.

## Current State (2026-09-26)
- **Phase**: UI polish & Bugfixes
- **Recent work**: 
  - Overhauled Samples & history table CSS for better readability and modern spacing.
  - Expanded sample name normalization to strip (T,X,Y) stability timepoints.
  - Fixed a frustrating UX bug in the Admin Settings where textareas swallowed empty lines, preventing deletion and triggering Zod validation errors.
  - Added collapsible state for the `settings-nav` sidebar in Admin Settings to maximize screen real estate for data entry.
  - Fixed search input visual bugs in the Admin Settings entity list, making it consistent with the rest of the application styling.
  - Implemented an auto-hide behavior for notification toasts (like ''Settings saved''), dismissing them automatically after 5 seconds to prevent them from persisting indefinitely.
- **Pending Actions**:
  - The user is actively updating product aliases in Settings to resolve a duplicate match error.
- Fixed an issue where the production database had 0 templates by auto-seeding demo-standardized.docx into the DB if the templates table is completely empty on server startup (TASK-20260926-014).

- Extracted historical specification limits from james.zip and embedded a product knowledge base so that tests generated from the Google Sheet now automatically receive the correct historical acceptance limits instead of blank strings (TASK-20260926-015).

## Next Actions
1. Ensure the user can successfully generate a report draft for a Stability sample in the Live workspace.
2. Await further instructions on any new workflow tweaks or report formatting adjustments needed by the Quality Control team.
