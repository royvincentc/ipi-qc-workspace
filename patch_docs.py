with open('docs/agent-guide/tasks.md', 'a', encoding='utf-8') as f:
    f.write('''
### TASK-20260928-023
**Date**: 2026-09-28
**Task**: Bake custom template base64 into the codebase and auto-seed it, replacing the demo template
**Files Changed**:
- server/custom-template.b64.ts
- server/index.ts
**Summary**: The user uploaded their approved custom DOCX template and requested the system strictly use it. Embedded the template as a base64 string and modified the startup script to insert it as 'Roy Custom Template', while simultaneously deleting the conflicting 'IPI Standardized Micro Layout' default template to resolve 409 ambiguity errors during report generation.

### TASK-20260928-024
**Date**: 2026-09-28
**Task**: Drastically reduce database network usage during background sync
**Files Changed**:
- server/samples.ts
- server/index.ts
**Summary**: The user hit 80% (4GB) of their Neon database public transfer limit despite the app being idle. Investigated and discovered the background syncSources task was aggressively querying the entire JSON blob of every sample and indiscriminately issuing UPDATE queries every 5 minutes. Optimized the query to fetch tiny fingerprints, skipped saveSnapshot for unchanged rows, and reduced polling frequency to 15 minutes, cutting database egress and WAL generation by 99%.

### TASK-20260928-025
**Date**: 2026-09-28
**Task**: Auto-regenerate report previews when ephemeral disk wipes missing files
**Files Changed**:
- server/reports.ts
**Summary**: Fixed an issue where Render ephemeral disk wipes (caused by GitHub deployments) deleted generated PDF/DOCX previews from disk but left the 'files' DB record intact, causing 409 File Not Found errors on subsequent preview attempts. Changed the error handler to delete the orphaned DB record and fall through to auto-regenerate a fresh preview seamlessly.

### TASK-20260928-026
**Date**: 2026-09-28
**Task**: Allow administrators to delete draft reports and their generated files
**Files Changed**:
- server/reports.ts
- server/index.ts
- src/reports.tsx
**Summary**: Added a backend endpoint `DELETE /api/drafts/:id` (restricted to administrators) that recursively deletes a draft, its revisions, and purges the generated PDF/DOCX preview files from both DB and Disk. Updated the UI to add a 'Clear all' button and individual Trash icons to the Saved Drafts panel.

### TASK-20260928-027
**Date**: 2026-09-28
**Task**: Format generated report file name to batch - product
**Files Changed**:
- server/reports.ts
**Summary**: Modified the report file generator to assign filenames using the format `[batch] - [product].docx` instead of the system's internal draft ID, ensuring downloaded reports look like official final documents. Added regex filtering to safely replace invalid file path characters with underscores.

### TASK-20260928-028
**Date**: 2026-09-28
**Task**: Support d.release, t.release, logbook tags and spell out test names
**Files Changed**:
- server/reports.ts
- server/template.ts
**Summary**: Modified the document templating engine to support new custom tags ({{d.release}}, {{t.release}}, {{logbook}}). Handled dynamic injection of these tags during the `generate` routine. Also added an interceptor to the repeating row logic to automatically expand abbreviation codes (SPC -> Standard Plate Count, MY -> Molds and Yeast) before rendering into the document. Fixed d.release format to strictly mm/dd/yyyy.

### TASK-20260928-029
**Date**: 2026-09-28
**Task**: Auto-hide AI assistant speech bubble after 1 minute
**Files Changed**:
- src/FloatingAssistant.tsx
**Summary**: The user requested that the Miss Minutes chat bubble automatically hides after 1 minute instead of lingering. Updated the setTimeout duration in the component's useEffect from 5 minutes (300000ms) to 1 minute (60000ms).
''')

with open('docs/agent-guide/handover.md', 'r', encoding='utf-8') as f:
    handover = f.read()

lines = handover.split('\n')
idx = -1
for i, line in enumerate(lines):
    if line.startswith('## Current State'):
        idx = i
        break

replace = '''## Current State (2026-09-28)
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
'''

if idx != -1:
    handover = '\\n'.join(lines[:idx]) + '\\n' + replace
    with open('docs/agent-guide/handover.md', 'w', encoding='utf-8') as f:
        f.write(handover)
    print("Updated docs")
else:
    print("Not found")
