# Managing the IPI Micro-QC workspace

Open **Settings** using an administrator account. Search the settings menu by task, such as “control number” or “template.” Changes remain unsaved until you choose **Save settings** and confirm them.

| Task | Where to go |
| --- | --- |
| Add or deactivate a product | Products / materials |
| Add a microbiological test or change its display label | Tests |
| Change a product’s applicable tests or acceptance criteria | Specifications |
| Add a dropdown choice | Lookup values, then connect the lookup in Form fields |
| Add a sample category | Sample types; configure its independent logbook section before enabling it |
| Add a field or change its label, requirement or default | Form fields |
| Change an ML prefix or number format | Control numbers |
| Change the standing signatory or filename prefix | Report defaults |
| Choose light, dark or device theme | Appearance |
| Connect spreadsheets and library folders | Connections |
| Prepare a copy of a historical report layout | Reference documents, then Report templates |
| Manage authorized accounts | Users & permissions |
| Find who changed a setting | Audit history |

## Source layouts and numbering

Each category retains independent columns and rows. A new category needs a corresponding section in the connected monthly logbook; adding a category does not create or rearrange spreadsheet columns. The layout editor is a controlled mapping interface. Its offsets are advanced settings and must match the workbook headers and merged ranges exactly.

New fields can stay in the app or map to an available column within the category section. Required identification fields cannot be removed. Existing items are disabled rather than deleted. Disabled categories with historical records retain their source mappings.

Changing source layouts, category availability or numbering pauses live intake. Recheck the relevant connections and intake readiness before enabling writes again. Existing color reservations still need explicit `RESERVED` reconciliation. New entries use only the current laboratory month, after the last occupied or reserved row. Annual sequences retain recognition of historical prefixes.

Test display order is separate from its applicability spreadsheet column. Changing how a test appears must not silently change which spreadsheet checkbox is read. Leave both the header and column blank for a test used only in managed specifications.

## Specifications and reports

Choose an active managed product and its testing context. Each acceptance criterion requires its source document, source location and explicit date. Saving an edit creates a new specification revision; earlier drafts and files keep their previous criteria. A superseded revision cannot overwrite its successor.

Actual results are always entered manually. Not entered, not tested, zero and negative remain distinct. Not-tested entries need a reason and do not satisfy required result checks. The app does not calculate pass/fail or release a sample.

New drafts snapshot their sample, specification, template and relevant configuration revision. Later settings changes apply to new work. Historical drafts whose original template is unavailable are flagged for review rather than silently moved to another layout. Generated files remain stored unchanged.

Report title, laboratory metadata and footer settings populate matching tokens only where a verified template provides them. Fixed form text and standardized geometry are preserved. The standing “Noted by” default is Celeste P. Yandug. Page X of Y remains automatic; logbook/page reference is entered separately. Report review and signatures remain outside the app.

## Development and live operation

The demo accepts clearly de-identified practice samples into its local database and never sends them to Google. Connections start blank. Live Google access, OAuth allowlisting, server credentials, PostgreSQL and private document storage must be configured in the deployment environment before operational use.

No credentials belong in the browser or the Settings form. Settings changes do not change Google sharing permissions.
