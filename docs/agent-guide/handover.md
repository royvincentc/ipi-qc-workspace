# IPI QC Microbiology Workspace — Active Handover

| Document control | Value |
|---|---|
| Document ID | IPI-AI-HANDOVER |
| Revision | 1.0 |
| Last updated | 2026-09-25, Asia/Manila |
| Prepared by | Codex (GPT-6) |
| Repository | `C:\Users\Roy\Documents\ChatGPT\IPI` |

This is the volatile transfer record. Update it whenever work pauses, finishes, changes direction, or transfers to another person/model. It supersedes older handoff notes as the current starting point; older files remain historical evidence and may contain inaccurate claims. Verify this file through [audit.md](audit.md), follow [goal.md](goal.md) and [rules.md](rules.md), and record all work in [tasks.md](tasks.md).

Do not put secrets, private keys, tokens, full connection strings, sensitive live data, or unnecessary share links in this document.

## Current objective

Move the audited development application toward a controlled first release in which sample logging/lookup and standardized report generation are equally complete. The immediate gates are live environment configuration, resolution of one Environmental Monitoring layout mismatch, controlled read-only import/reconciliation, and approved DOCX template/criteria decisions.

**Current phase:** integration, control hardening, and release validation. The development implementation spans the original Phases 1–10, while active work is concentrated in Phases 9–12. It is not yet a controlled live release.

## Repository state at transfer

- Branch: `master`
- HEAD: `5d866cc` (`chore: establish Plan IQC workspace baseline and UI redesign`)
- Working tree: intentionally dirty; do not reset or discard it.
- Modified tracked files:
  - `package.json`
  - `server/configuration.ts`
  - `server/domain.ts`
  - `server/seed.ts`
  - `shared/configuration.ts`
  - `src/App.tsx`
  - `src/admin.tsx`
  - `src/overhaul.css`
  - `src/styles.css`
  - `tests/domain.test.ts`
  - `worker/docx_worker.py`
  - `worker/test_docx_worker.py`
- Untracked before this guide was created:
  - `docs/HANDOFF_GEMINI_TO_CHATGPT.md`
  - `scripts/verify-google-connections.mjs`
- Added by this documentation task:
  - `docs/agent-guide/goal.md`
  - `docs/agent-guide/tasks.md`
  - `docs/agent-guide/rules.md`
  - `docs/agent-guide/audit.md`
  - `docs/agent-guide/handover.md`
  - `docs/agent-guide/prompt.md`

Inspect the current diff before editing. Some files contain corrections made after the Gemini handoff and are not represented by HEAD alone.

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

### Automated and browser checks

- 38 Node/domain tests passed.
- 7 Python DOCX worker tests passed.
- TypeScript typecheck passed.
- Vite production build passed.
- Desktop and phone browser checks confirmed working search and Settings, no console warnings/errors observed, and no phone page-level horizontal overflow.
- The current archive-based sample PDF was rendered and visually compared with its reference layout. The incubation prefixes are absent; `Celeste P. Yandug — Assistant Head, Microbiology Laboratory` is present; PAGE and NUMPAGES fields remain automatic. The template still requires IPI approval and human review of inherited drawing objects.

These results describe the audited working tree on 2026-09-25. Rerun relevant checks after further edits; do not carry them forward as permanent proof.

### Google connections

Authentication succeeded using the shared service-account identity `sample-logger-backend@gen-lang-client-0151849181.iam.gserviceaccount.com`.

- Incoming Logbook: passed 9 monthly tabs and 54 category-section layouts.
- Product Specifications: passed 2 tabs and 92 product rows.
- Environmental Monitoring: 8 of 9 monthly tabs passed.
- Blocked tab: `JUNE (ENVI) 2026`; expected `ENVIRONMENTAL MONITORING` was absent/blank in A1:R3 during validation.
- No Google cells or permissions were changed.

Keep the June tab blocked until IPI reviews whether the sheet should be corrected or a new layout revision should be explicitly approved. Do not weaken validation globally to make the test green.

## Known environment and readiness limits

- Links entered through the current Settings flow are in the local/demo PGlite environment, not a confirmed production database.
- The configured live PostgreSQL target is a placeholder/unreachable in the inspected environment.
- Google OAuth client configuration, initial admin allowlist, and deploy-time service-account credential configuration are not complete in the application environment.
- Google write operations remain disabled and are not authorized by the successful read-only test.
- Historical reports provide useful criteria/layout evidence, but approved blank templates and a formally controlled criteria source/process still need IPI decisions.
- Existing `docs/HANDOFF.md` and `docs/HANDOFF_GEMINI_TO_CHATGPT.md` contain claims that conflict with repository evidence. Preserve them as history; do not treat them as authority.
- On this machine, the ordinary global `npm` launcher is unusable because its expected global npm CLI path is missing. Use the bundled Node/Python runtimes and direct local package binaries. A bundled `pnpm` attempt tried to relocate npm-managed dependencies before its network request failed; the packages were restored from `node_modules/.ignored`. Do not run `pnpm` against this existing dependency tree without an intentional package-manager migration.

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

1. Run the audit procedure against the full working-tree diff and confirm that this handover still matches the repository.
2. Have the project owner or authorized laboratory owner review `JUNE (ENVI) 2026`; document the decision and rerun the read-only verifier.
3. Configure a real PostgreSQL environment, Google OAuth client, administrator allowlist, and server-side service-account secret through the chosen deployment platform. Test authentication and role enforcement without exposing credentials.
4. Back up and use a disposable copy to validate migrations and configuration seeding before touching live application data.
5. Run a read-only initial import; reconcile duplicate ML records, direct edits, color-only reservations, and numbering state. Produce a review report before enabling writes.
6. Designate the first approved blank report template and authoritative criteria decision process. Render and visually compare a generated sample PDF/DOCX against the approved format.
7. Exercise the full de-identified sample → applicable specification → manual results → review → DOCX workflow on desktop and phone.
8. Only after the above controls pass, prepare a focused reviewed commit/PR with ledger evidence. Enabling live writes is a separate controlled decision.

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
