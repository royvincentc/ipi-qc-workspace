# Workspace overhaul

## Verified baseline
React 19 / Vite / TypeScript client, Express 5 API, PostgreSQL JSON records (PGlite for isolated demos), Google OAuth allowlist and three server-enforced roles. Google Sheets handles operational samples; Python processes standardized DOCX and Word/LibreOffice renders previews. Existing screens: home, intake, search, sample detail, drafts/manual results, files, connections, reference inspection, templates, users and audit.

Business constants currently live in model.ts, domain.ts, intake JSX, Google applicability mapping and report preparation. Existing samples, draft revisions and generated files retain snapshots, but templates are fetched by current ID. Configuration management is incomplete. Lists fetch all samples; forms lack navigation guards; the home hero obscures actionable work. Category-dependent spreadsheet routing and explicit result entry must remain intact.

## Implementation sequence
1. Add versioned, validated configuration storage and seed existing values once. Retain IDs and backup the demo database before migration.
2. Route sample fields, category labels, number rules, test catalog and report defaults through configuration. Validate on the server; preserve old snapshots.
3. Add a searchable Settings Center for general settings, sample types, form fields, tests, products, lookups, numbers, reports and existing connections/users/history. Archive rather than delete.
4. Replace the home hero with work queues, improve sample search/table and category-driven intake, add themes and responsive navigation.
5. Verify build, existing regression tests and new configuration/history tests; exercise desktop/mobile flows.

## Safety and migration
Additive tables only. Seed from existing category/mapping/test values and specification records. Configuration saves use expected revisions, transactions and old/new audit records. Existing result and specification snapshots never change when settings change. Internal security roles and result states remain program logic. Source mappings and number changes are constrained and require revalidation before live intake. No live connections or company data are enabled by this work.

## Risks
Spreadsheet column changes can misroute data; numbering edits can collide with legacy series; template replacement can affect old drafts; uncontrolled specification edits can rewrite history. Mitigations are mapping validation, immutable configuration revisions, legacy number recognition, pinned draft/template snapshots and additive specification revisions. DOCX layout remains reference-driven, not an arbitrary visual editor.

## Implemented changes
- Added `configuration` and immutable `configuration_revisions` tables, optimistic revision checks and old/new audit records. Existing record tables and identifiers are retained.
- Seeded the original catalogs and mappings once; demo startup no longer resets managed settings.
- Routed intake forms, validation, mappings, numbering, applicability test columns, catalog labels and report defaults through configuration.
- Added the Settings Center and additive specification editing, preserving draft and file snapshots.
- Replaced the dashboard hero with work queues and quick actions; added global sample search, server pagination, filters, numeric ordering and a paginated file library.
- Added configuration-driven intake, navigation guards, readable history, accessible dialogs, theme/density preferences and responsive layouts.
- Added isolated configuration regression tests. Existing domain and DOCX tests remain in place.

The pre-migration demo database copy is kept in private/backups/pre-configuration-overhaul. It is excluded from source control. Live Google Sheets and production OAuth were not exercised because live connections remain intentionally blank.
