# IPI QC Microbiology Workspace — Continuation Prompt

| Document control | Value |
|---|---|
| Document ID | IPI-AI-PROMPT |
| Revision | 1.0 |
| Effective date | 2026-09-25 |
| Purpose | Copy-paste entry point that binds the five project governance files |

Copy the prompt below when transferring this project to another AI model or agent. Keep this file in the same `docs/agent-guide` directory as `goal.md`, `tasks.md`, `rules.md`, `audit.md`, and `handover.md`.

If the repository is moved, replace the repository path in the first paragraph. Relative paths remain the same. When files are uploaded instead of mounted, the agent must read the attached files with the corresponding names.

## Copy-paste prompt

```text
Continue the existing IPI QC Microbiology Workspace project. The repository root is:

C:\Users\Roy\Documents\ChatGPT\IPI

This is an active project with inherited work. Do not restart it, replace it with a new prototype, or rely only on a previous agent's summary.

Before planning or changing anything, read these five files completely from the repository in this exact order:

1. C:\Users\Roy\Documents\ChatGPT\IPI\docs\agent-guide\goal.md
2. C:\Users\Roy\Documents\ChatGPT\IPI\docs\agent-guide\rules.md
3. C:\Users\Roy\Documents\ChatGPT\IPI\docs\agent-guide\tasks.md
4. C:\Users\Roy\Documents\ChatGPT\IPI\docs\agent-guide\audit.md
5. C:\Users\Roy\Documents\ChatGPT\IPI\docs\agent-guide\handover.md

If those absolute paths are unavailable, locate `docs/agent-guide` relative to the repository root. If the documents were supplied as attachments, read the attached files with those names. Do not claim to have read a file that was unavailable.

Use `goal.md` as the stable project direction and `rules.md` as the strict implementation and data-integrity contract. Use `tasks.md` as the append-only work record. Apply `audit.md` to verify inherited claims and changes. Use `handover.md` to identify the active phase, exact repository state, blockers, decisions that must be preserved, and the first executable next action.

After reading them:

1. Inspect the actual repository, including git status, branch and HEAD, working-tree diff, architecture, schema/migrations, environment, and relevant tests. Preserve all user and inherited uncommitted work.
2. Reconcile the handover and task ledger with direct evidence. Repository inspection, executable tests, rendered reports, and authorized read-only source checks outrank unsupported completion claims.
3. State the current phase and the next concrete action briefly, then proceed with implementation. Do not stop after producing another plan when an authorized, safe, executable task remains.
4. Continue the phase/task already in progress. Choose the highest-priority unblocked action from `handover.md` and `tasks.md` that advances the goal. Maintain sample logging/lookup and report generation as equal priorities.
5. Follow all data-integrity, ALCOA+, Google Sheets routing, manual-result, report-format, security, configuration-versioning, and historical-integrity rules. Never invent laboratory data or silently resolve a scientific ambiguity.
6. Treat live company data as read-only unless an explicit current authorization permits the exact write. A successful connection test does not authorize writing. Do not expose credentials or secrets.
7. Run the checks appropriate to every change and retain evidence. Distinguish implemented, tested, visually verified, configured, authorized, and production-ready states.
8. Record every material change, finding, failed attempt, validation result, and unresolved problem in `tasks.md`. Do not erase or rewrite earlier history; append corrections when needed.
9. Before stopping or transferring work, update `handover.md` with the current timestamp, agent identity, branch/HEAD, dirty-file inventory, completed task IDs, tests and results, data/source access, blockers, preserved decisions, rollback notes, and ordered next actions.
10. Do not modify `goal.md` or materially weaken `rules.md` unless the project owner explicitly authorizes that change. If a conflict affects scientific meaning, live records, standardized report format, security, or irreversible data, document it and obtain the required human decision. Continue independent work that is not blocked.

Work autonomously within the already authorized project scope. Prefer reversible, evidence-based changes. Protect historical records and preserve the standardized IPI report format. The project is not complete merely because the UI builds; completion requires the acceptance evidence defined in `goal.md` and `tasks.md`.
```

## Transfer checklist

Before copying the prompt to another agent:

- Keep all six Markdown files together.
- Update `handover.md` immediately before transfer.
- Ensure the current work appears in `tasks.md`.
- Include or provide access to the repository; the Markdown files alone do not prove implementation state.
- Never add credentials, private keys, tokens, or sensitive live data to the prompt or handover.
