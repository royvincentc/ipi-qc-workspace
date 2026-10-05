from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import shutil
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(r"C:\Users\Roy\Documents\ChatGPT\IPI")
BASE = ROOT / "output" / "environmental-monitoring-baseline"
SOURCE_ZIP = Path(r"C:\Users\Roy\Documents\PF-Environmental Monitoring.zip")
CONTROLLED_COPY = Path(r"C:\Users\Roy\Documents\ipi format\ENVI.docx")
TAGGED_CANDIDATE = ROOT / "output" / "Environmental Monitoring Tagged Template Candidate.docx"
OUT = ROOT / "output" / "Environmental Monitoring Format Review Package"
OUT.mkdir(parents=True, exist_ok=True)

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def cell_text(cell: ET.Element) -> str:
    return clean(" ".join(x.text or "" for x in cell.findall(".//w:t", NS)))


def analyze_docx(blob: bytes):
    with zipfile.ZipFile(io.BytesIO(blob)) as doc:
        root = ET.fromstring(doc.read("word/document.xml"))
    tables = []
    for table in root.findall(".//w:tbl", NS):
        rows = [[cell_text(c) for c in row.findall("./w:tc", NS)] for row in table.findall("./w:tr", NS)]
        rows = [r for r in rows if any(r)]
        if rows:
            tables.append(rows)
    for table in tables:
        if any("result" in " ".join(row).lower() for row in table[:3]):
            widths = tuple(len(row) for row in table[:3])
            header = " | ".join(table[0])
            return {"cols": len(table[0]), "widths": widths, "header": header, "table_rows": len(table)}
    return None


def write_csv(path: Path, headers, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


with (BASE / "baseline-summary.json").open(encoding="utf-8") as f:
    summary = json.load(f)

formats = [
    {
        "format_id": "EM-5C-GROUPED",
        "display_name": "Environmental Monitoring — grouped five-column table",
        "status": "PRIMARY REVIEW CANDIDATE",
        "table_topology": "5 columns: Analysis Desired | Area | Standard Specifications | Results | Remarks",
        "grouping_behavior": "Analysis Desired and Standard Specifications span each test group; Area/Results/Remarks repeat per location",
        "observed_evidence": "3,603 standard five-column reports; plus 13 sparse two-row reports with the same header topology",
        "proposed_route": "Routine Accupoint and SPC/MY product profiles when their approved report uses this topology",
        "source_reference": "User-supplied ENVI.docx copy is included as a tagged style candidate; archive examples are evidence only",
        "review_decision": "Confirm the controlled blank master, group labels, merges, and approved sampling-plan source",
    },
    {
        "format_id": "EM-GIP-4C",
        "display_name": "Environmental Monitoring — GIP four-column table",
        "status": "SEPARATE FORMAT CANDIDATE — OWNER REVIEW",
        "table_topology": "4 logical columns: Analysis Desired | Standard Specifications | Results | Remarks; subrows may use merged cells",
        "grouping_behavior": "Test group with location subrows (e.g. Top/Bottom); historical documents contain grouped/merged cells",
        "observed_evidence": "2 documents in the supplied archive",
        "proposed_route": "GIP report profile only if this is still an approved report type",
        "source_reference": "PF- Environmental Monitoring/2024/Herbycin Syrup/GIP/Herbycin Syrup GIP LWJ02.docx and LWJ03.docx",
        "review_decision": "Confirm active use and provide/identify the approved blank master before creating a production DOCX",
    },
    {
        "format_id": "EM-WATER-4C",
        "display_name": "Environmental Monitoring — water validation four-column table",
        "status": "SEPARATE FORMAT CANDIDATE — OWNER REVIEW",
        "table_topology": "4 columns: Analysis Desired | Standard Specifications | Results | Remarks",
        "grouping_behavior": "One result row per test; separate validation-stage/sample profiles may select the applicable record",
        "observed_evidence": "3 Water Treatment Validation documents in the supplied archive",
        "proposed_route": "Water-treatment validation profile only if still in scope",
        "source_reference": "PF- Environmental Monitoring/2026/SPCMY - Water Treatment Validation- Source.docx, T3 SP.docx, and T4 SP.docx",
        "review_decision": "Confirm approved document, stage routing, and data source; archive values are not carried forward",
    },
    {
        "format_id": "EM-WH-PHASE-7C",
        "display_name": "Environmental Monitoring — warehouse phase / active-passive air table",
        "status": "SEPARATE FORMAT CANDIDATE — OWNER REVIEW",
        "table_topology": "7 logical columns with a two-level Results header (Active Air and Passive Air); first header row includes merged cells",
        "grouping_behavior": "SPC group contains phase and area subrows with paired active/passive result cells",
        "observed_evidence": "3 Warehouse 4 qualification documents in the supplied archive",
        "proposed_route": "Warehouse qualification profile only if still in scope",
        "source_reference": "PF- Environmental Monitoring/2025/Warehouse 4 Internal Sampling Area/ (three qualification reports)",
        "review_decision": "Confirm active use and approved blank master; layout requires a dedicated renderer adapter",
    },
]

write_csv(OUT / "01-format-catalog.csv", list(formats[0].keys()), formats)

# Product/method combinations are evidence counts, not an approved applicability list.
profiles = []
for label, doc_count in sorted(summary["documents_by_product_method"].items()):
    if " | " not in label:
        continue
    product, method = label.rsplit(" | ", 1)
    if product.startswith("SPCMY - Water Treatment Validation"):
        format_id = "EM-WATER-4C"
        route_status = "OWNER REVIEW — HISTORICAL VALIDATION FORM"
    else:
        format_id = "EM-5C-GROUPED"
        route_status = "PROPOSED SHARED FORMAT — CONFIRM PRODUCT/METHOD APPLICABILITY"
    profiles.append({
        "product_or_source_label": product,
        "method": method,
        "archive_document_count_2026": doc_count,
        "proposed_format_id": format_id,
        "proposed_profile_key": re.sub(r"[^A-Z0-9]+", "-", (product + "-" + method).upper()).strip("-"),
        "process_area": "OWNER TO CONFIRM (Compounding / Filling / Weighing / other)",
        "sampling_plan_source": "OWNER TO IDENTIFY controlled approved plan",
        "review_status": route_status,
        "owner_decision": "",
    })
profiles.extend([
    {"product_or_source_label": "Herbycin Syrup — GIP", "method": "GIP", "archive_document_count_2026": 0,
     "proposed_format_id": "EM-GIP-4C", "proposed_profile_key": "HERBYCIN-SYRUP-GIP", "process_area": "OWNER TO CONFIRM",
     "sampling_plan_source": "OWNER TO IDENTIFY", "review_status": "OWNER REVIEW — TWO HISTORICAL 2024 REPORTS", "owner_decision": ""},
    {"product_or_source_label": "Warehouse 4 Internal Sampling Area — Qualification", "method": "SPC / Active Air / Passive Air", "archive_document_count_2026": 0,
     "proposed_format_id": "EM-WH-PHASE-7C", "proposed_profile_key": "WAREHOUSE-4-QUALIFICATION", "process_area": "Warehouse 4",
     "sampling_plan_source": "OWNER TO IDENTIFY", "review_status": "OWNER REVIEW — THREE HISTORICAL 2025 REPORTS", "owner_decision": ""},
])
profile_headers = list(profiles[0].keys())
write_csv(OUT / "02-product-format-review.csv", profile_headers, profiles)

# Aggregate only high-confidence historical activity labels and criteria. Never export historical readings.
activity_path = BASE / "reporting-high-confidence-activities.csv"
groups = defaultdict(lambda: {"count": 0, "docs": set(), "matches": set()})
with activity_path.open(encoding="utf-8-sig", newline="") as f:
    for row in csv.DictReader(f):
        key = (row.get("product", ""), row.get("method", ""), row.get("process_area", ""), row.get("activity_location", ""), row.get("standard_specification", ""))
        g = groups[key]
        g["count"] += 1
        g["docs"].add(row.get("document_name", ""))
        g["matches"].add(row.get("matched_ml_number", ""))
plan_rows = []
for (product, method, area, location, criterion), g in sorted(groups.items()):
    family = "EM-5C-GROUPED"
    if product.startswith("SPCMY - Water Treatment Validation"):
        family = "EM-WATER-4C"
    plan_rows.append({
        "product": product, "method": method, "process_area": area, "test_or_criterion_context": method,
        "candidate_location_from_archive": location, "candidate_historical_criterion": criterion,
        "observed_occurrences_high_confidence": g["count"], "distinct_archive_reports": len(g["docs"]),
        "format_candidate": family, "source_type": "Historical archive evidence; not approved sampling plan",
        "current_sampling_plan_approval": "UNCONFIRMED", "owner_review": "",
    })
plan_headers = list(plan_rows[0].keys()) if plan_rows else []
write_csv(OUT / "03-candidate-sampling-plan-review.csv", plan_headers, plan_rows)

# Full structural signature scan. Keep only report table signatures and outlier examples.
signature_counts = Counter()
signature_examples = defaultdict(list)
docx_count = 0
with zipfile.ZipFile(SOURCE_ZIP) as archive:
    for name in archive.namelist():
        if not name.lower().endswith(".docx") or name.rsplit("/", 1)[-1].startswith("~$"):
            continue
        docx_count += 1
        try:
            sig = analyze_docx(archive.read(name))
        except Exception:
            continue
        if not sig:
            continue
        key = (sig["cols"], sig["widths"], sig["header"])
        signature_counts[key] += 1
        if len(signature_examples[key]) < 12:
            signature_examples[key].append(name)

struct_rows = []
for (cols, widths, header), count in signature_counts.most_common():
    distinct = not (cols == 5 and "Analysis Desired" in header and "Standard Specifications" in header and "Results" in header and "Remarks" in header)
    for example in signature_examples[(cols, widths, header)]:
        struct_rows.append({
            "documents_in_signature": count,
            "logical_columns_first_rows": f"{cols}; row widths {','.join(map(str, widths))}",
            "header_text": header,
            "format_candidate": "EM-5C-GROUPED" if not distinct else ("EM-WH-PHASE-7C" if cols >= 6 else "REVIEW-4C-OR-OTHER"),
            "example_archive_path": example,
            "classification": "Shared five-column topology" if not distinct else "Structurally distinct; owner review required",
        })
write_csv(OUT / "04-archive-structure-evidence.csv", list(struct_rows[0].keys()), struct_rows)

grouped_schema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "title": "IPI Environmental Monitoring Product Report Profile (review draft)",
    "description": "A product profile routes to one approved document family and separately supplies an approved sampling plan. This is a review specification, not yet supported by the current renderer.",
    "type": "object",
    "required": ["profileId", "status", "formatId", "selector", "samplingPlan", "resultEntryPolicy"],
    "properties": {
        "profileId": {"type": "string"},
        "status": {"enum": ["draft-review", "owner-approved", "retired"]},
        "formatId": {"enum": ["EM-5C-GROUPED", "EM-GIP-4C", "EM-WATER-4C", "EM-WH-PHASE-7C"]},
        "selector": {"type": "object", "required": ["product", "method"], "properties": {"product": {"type": "string"}, "method": {"type": "string"}, "processArea": {"type": "string"}}},
        "samplingPlan": {"type": "array", "items": {"type": "object", "required": ["groupKey", "analysisDesired", "criterion", "rows"], "properties": {
            "groupKey": {"type": "string"}, "analysisDesired": {"type": "string"}, "criterion": {"type": "string"},
            "rows": {"type": "array", "items": {"type": "object", "required": ["rowKey", "location"], "properties": {"rowKey": {"type": "string"}, "location": {"type": "string"}, "phase": {"type": "string"}, "resultChannels": {"type": "array", "items": {"type": "string"}}}}
        }}}},
        "resultEntryPolicy": {"const": "manual-attributable-entry; no historical result prefill"},
        "approvalReference": {"type": "string"},
        "revision": {"type": "string"}
    }
}
(OUT / "05-product-profile-schema.json").write_text(json.dumps(grouped_schema, indent=2), encoding="utf-8")

adapter_specs = {
    "status": "draft-review; proposed renderer contract, not supported by the current renderer",
    "routingRule": "Every active product+method+process-area selector must resolve to exactly one profile and one format revision.",
    "formats": [
        {"formatId": "EM-5C-GROUPED", "archiveTopology": ["Analysis Desired", "Area", "Standard Specifications", "Results", "Remarks"],
         "repeatModel": "groups[] -> rows[]", "cellRoles": {"Analysis Desired": "group.label; merge vertically for the group's rows", "Area": "row.location", "Standard Specifications": "group.criterion; merge vertically for the group's rows", "Results": "row.result", "Remarks": "row.remarks"},
         "proposedRowTokens": ["{{#groups}}", "{{group.label}}", "{{group.criterion}}", "{{#rows}}", "{{row.location}}", "{{row.result}}", "{{row.remarks}}", "{{/rows}}", "{{/groups}}"],
         "evidence": "3,603 populated standard tables plus 13 sparse documents sharing the header topology; Accupoint/SPC-MY are profile differences when the table shape matches."},
        {"formatId": "EM-GIP-4C", "archiveTopology": ["Analysis Desired", "Standard Specifications", "Results", "Remarks"],
         "repeatModel": "groups[] -> rows[]; source has merged group cells", "cellRoles": {"Analysis Desired": "group.label and row.location according to approved master", "Standard Specifications": "group.criterion", "Results": "row.result", "Remarks": "row.remarks"},
         "proposedRowTokens": ["{{#groups}}", "{{group.label}}", "{{group.criterion}}", "{{#rows}}", "{{row.location}}", "{{row.result}}", "{{row.remarks}}", "{{/rows}}", "{{/groups}}"],
         "evidence": "Two Herbycin Syrup GIP archive reports; identify an approved blank master before use."},
        {"formatId": "EM-WATER-4C", "archiveTopology": ["Analysis Desired", "Standard Specifications", "Results", "Remarks"],
         "repeatModel": "tests[] -> one result row per applicable test/stage", "cellRoles": {"Analysis Desired": "test.label", "Standard Specifications": "test.criterion", "Results": "test.result", "Remarks": "test.remarks"},
         "proposedRowTokens": ["{{#tests}}", "{{test.label}}", "{{test.criterion}}", "{{test.result}}", "{{test.remarks}}", "{{/tests}}"],
         "evidence": "Three Water Treatment Validation archive reports (Source, T3 SP, T4 SP); stage selection must be explicitly confirmed."},
        {"formatId": "EM-WH-PHASE-7C", "archiveTopology": ["Analysis Desired", "Phase", "Area", "Standard Specifications", "Active Air", "Passive Air", "Remarks"],
         "repeatModel": "groups[] -> phases[]/locations[]; two-level merged Results header", "cellRoles": {"Analysis Desired": "group.label", "Phase": "row.phase", "Area": "row.location", "Standard Specifications": "group.criterion", "Active Air": "row.activeAirResult", "Passive Air": "row.passiveAirResult", "Remarks": "row.remarks"},
         "proposedRowTokens": ["{{#groups}}", "{{group.label}}", "{{group.criterion}}", "{{#rows}}", "{{row.phase}}", "{{row.location}}", "{{row.activeAirResult}}", "{{row.passiveAirResult}}", "{{row.remarks}}", "{{/rows}}", "{{/groups}}"],
         "evidence": "Three Warehouse 4 qualification reports; dedicated table adapter and approved blank master required."}
    ],
    "fieldProvenance": {"sample identifiers and logbook metadata": "selected source logbook row, after owner confirms field mapping", "locations and phases": "current controlled product sampling plan", "criteria": "current approved specification", "actual results and remarks": "manual attributable entry only", "signatures and release": "blank/manual controlled workflow; never copied from archive"},
    "notImplemented": ["nested repeat blocks", "vertical merge creation from group row counts", "profile routing in app", "unique seven-column multi-level result header adapter"]
}
(OUT / "08-renderer-adapter-specs.json").write_text(json.dumps(adapter_specs, indent=2), encoding="utf-8")

sample_profile = {
    "profileId": "REVIEW-ONLY-MAMAS-LOVE-SPCMY-COMPOUNDING",
    "status": "draft-review",
    "formatId": "EM-5C-GROUPED",
    "selector": {"product": "Mama's Love Baby Oil", "method": "SPC/MY", "processArea": "Compounding"},
    "samplingPlan": [
        {"groupKey": "spc", "analysisDesired": "Standard Plate Count (SPC)", "criterion": "[owner-confirmed criterion]", "rows": [
            {"rowKey": "spc-location-001", "location": "[owner-confirmed location]"},
            {"rowKey": "spc-location-002", "location": "[owner-confirmed location]"}
        ]},
        {"groupKey": "my", "analysisDesired": "Molds and Yeast", "criterion": "[owner-confirmed criterion]", "rows": [
            {"rowKey": "my-location-001", "location": "[owner-confirmed location]"},
            {"rowKey": "my-location-002", "location": "[owner-confirmed location]"}
        ]}
    ],
    "resultEntryPolicy": "manual-attributable-entry; no historical result prefill",
    "approvalReference": "[controlled sampling plan ID/revision required]",
    "revision": "draft-1"
}
(OUT / "06-example-grouped-profile.json").write_text(json.dumps(sample_profile, indent=2), encoding="utf-8")

# Copy the user's tagged working copy to the package, never edit the source file.
shutil.copy2(CONTROLLED_COPY, OUT / "07-ENVI-tagged-style-candidate-copy.docx")

readme = f"""# Environmental Monitoring Format Review Package

**Purpose:** owner review of report-family routing and product-specific grouped rows. This package is not a production template registration and does not change the controlled source file.

## Files

- `07-ENVI-tagged-style-candidate-copy.docx` — a byte-for-byte copy of the user-supplied tagged working document. The source at `C:\\Users\\Roy\\Documents\\ipi format\\ENVI.docx` was not edited. The current application accepts the tags structurally, but its renderer does not yet build nested test groups or vertical merges.
- `01-format-catalog.csv` — proposed reusable format families and evidence counts.
- `02-product-format-review.csv` — observed product/method pairs and a proposed route for owner confirmation.
- `03-candidate-sampling-plan-review.csv` — deduplicated historical locations/criteria from high-confidence archive matches, without historical result readings. These are evidence candidates only, not current approved plans.
- `04-archive-structure-evidence.csv` — report table signatures and representative archive paths for manual checking.
- `05-product-profile-schema.json` and `06-example-grouped-profile.json` — proposed data structure for product routing and group/row population.
- `08-renderer-adapter-specs.json` — table-cell bindings and grouped-repeat behavior proposed for each format family.
- `07-product-format-review.xlsx` — the same review data in workbook tabs for convenience.

## Findings from this scan

- Scanned {docx_count:,} DOCX entries from the supplied ZIP. {sum(signature_counts.values()):,} contained a table with a Results header recognizable by the structural scan.
- {signature_counts.get((5, (5, 5, 5), 'ANALYSIS DESIRED: | Area | Standard Specifications | Results | Remarks'), 0):,} standard five-column tables were found; 13 additional sparse two-row documents share the same five-column header family. Accupoint and SPC/MY are method/profile differences when the approved table topology is the same; they do not automatically need different DOCX files.
- The structural exceptions confirmed in this scan are: two four-column GIP reports, three four-column Water Treatment Validation reports, and three Warehouse 4 qualification reports with a two-level Active Air / Passive Air result header. Each needs its own format adapter if still in current use.
- One historical report has a misspelled `Standard Specifications` header. It is not treated as a new family based on a single typo.
- Earlier notes mentioned Open Plate Exposure as a three-column exception. This ZIP-wide structural scan did not confirm a three-column result-table signature, so it is not included as a format family here. Please identify a source report if Open Plate Exposure is still needed.

## Manual review workflow

1. Review the 5-column DOCX copy against the approved signed/controlled blank and screenshot. Confirm the tags occupy only variable fields and that the approved table grouping/merges are represented.
2. Review each distinct-format archive path in `04-archive-structure-evidence.csv`. Decide whether GIP, water validation, and warehouse qualification remain in scope and identify the approved blank master for each.
3. In `02-product-format-review.csv`, confirm which product + method + process-area combinations use each format. Change the owner decision column; leave uncertain rows unresolved.
4. Review every candidate location and criterion in `03-candidate-sampling-plan-review.csv` against the current controlled sampling plan. Do not approve a plan solely from archive frequency.
5. Resolve each format to one unique active product profile. A sample must match exactly one active profile to prevent the existing multiple-layout ambiguity error.

## Data and renderer limits

- The logbook row for `ML-EM-26-0488` records a monitored-equipment count, not individual locations. Product rows therefore come from a separately controlled sampling plan.
- Historical report readings, pass/fail remarks, analyst identities, dates, and signatures are not used as current-result defaults.
- The current app renderer repeats a flat result row. The grouped JSON schema is a proposed renderer contract; grouped-row population and merged group cells need implementation before these profiles can generate the requested layout.
- This DOCX was not rendered for visual QA in this environment. The included DOCX is a review copy, not evidence that the generated output visually matches the approved form.
"""
(OUT / "README-REVIEW-ME.md").write_text(readme, encoding="utf-8")

# Readable workbook for manual review.
wb = Workbook()
ws = wb.active
ws.title = "Read Me"
readme_rows = [
    ["Environmental Monitoring Format Review Package"],
    ["Purpose", "Manual confirmation of reusable report families and product routes."],
    ["State", "Draft review only; not registered or production-approved."],
    ["Controlled file", "The supplied ENVI.docx was copied into this package and not edited in place."],
    ["Main conclusion", "Share one five-column format where topology matches; vary product sampling profiles and grouped rows."],
    ["Unique candidates", "GIP four-column; Water Treatment Validation four-column; Warehouse phase / Active-Air-Passive-Air seven-column."],
    ["Caution", "Archive-derived locations/criteria are evidence candidates, not current approved sampling plans."],
    ["Renderer gap", "Current renderer does not generate nested groups or vertical merges; implementation is needed."],
]
for row in readme_rows: ws.append(row)

def add_sheet(title, rows):
    sh = wb.create_sheet(title)
    if not rows: return sh
    headers = list(rows[0].keys())
    sh.append(headers)
    for row in rows: sh.append([row.get(h, "") for h in headers])
    return sh

add_sheet("Format Families", formats)
add_sheet("Product Routes", profiles)
add_sheet("Sampling Evidence", plan_rows)
add_sheet("Archive Examples", struct_rows)
for sh in wb.worksheets:
    sh.freeze_panes = "A2" if sh.title != "Read Me" else "A2"
    if sh.max_row > 1 and sh.title != "Read Me":
        sh.auto_filter.ref = sh.dimensions
        for cell in sh[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="1F4E78")
            cell.alignment = Alignment(wrap_text=True, vertical="top")
        for col in sh.columns:
            letter = get_column_letter(col[0].column)
            max_len = max((len(str(c.value or "")) for c in col[: min(sh.max_row, 100)]), default=10)
            sh.column_dimensions[letter].width = min(max(max_len + 2, 14), 54)
        for row in sh.iter_rows(min_row=2):
            for c in row: c.alignment = Alignment(wrap_text=True, vertical="top")
    else:
        sh.column_dimensions["A"].width = 34
        sh.column_dimensions["B"].width = 110
        for row in sh.iter_rows():
            for c in row: c.alignment = Alignment(wrap_text=True, vertical="top")
wb.save(OUT / "07-product-format-review.xlsx")

# Bundle review files into one portable archive.
bundle = ROOT / "output" / "Environmental Monitoring Format Review Package.zip"
with zipfile.ZipFile(bundle, "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.iterdir()):
        if p.is_file():
            z.write(p, arcname=f"Environmental Monitoring Format Review Package/{p.name}")

print(json.dumps({"package": str(OUT), "zip": str(bundle), "docx_entries_scanned": docx_count, "recognized_result_tables": sum(signature_counts.values()), "signatures": [{"count": count, "cols": key[0], "row_widths": key[1], "header": key[2]} for key, count in signature_counts.most_common()], "product_profiles": len(profiles), "sampling_plan_rows": len(plan_rows), "files": [p.name for p in sorted(OUT.iterdir())]}, indent=2))
