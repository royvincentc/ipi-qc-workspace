"""Create a read-only reconciliation baseline from the environmental archive and logbook export."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import zipfile
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
HEADERS = [
    "date_received", "facility", "ml_number", "product", "area", "category",
    "secondary_category", "batch", "equipment_monitored", "accupoint_samplers",
    "plates_used", "received_by", "analyzed_by", "proceed_read_by", "date_analyzed",
    "date_released", "status", "remarks",
]
BATCH = re.compile(r"\b[A-Z]{2}[A-L][0-9]{2}\b", re.I)


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def key(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", clean(value).lower())


def extract_text(node: ET.Element) -> str:
    return clean(" ".join(part.text or "" for part in node.findall(".//w:t", NS)))


def docx_tables(blob: bytes) -> tuple[str, list[list[list[str]]]]:
    with zipfile.ZipFile(io.BytesIO(blob)) as docx:
        xml = docx.read("word/document.xml")
        header_text = [extract_text(ET.fromstring(docx.read(name))) for name in docx.namelist() if re.fullmatch(r"word/header\d+\.xml", name)]
    root = ET.fromstring(xml)
    all_text = clean(" ".join(header_text + [extract_text(root)]))
    tables = []
    for table in root.findall(".//w:tbl", NS):
        rows = []
        for row in table.findall("./w:tr", NS):
            cells = [extract_text(cell) for cell in row.findall("./w:tc", NS)]
            if any(cells):
                rows.append(cells)
        if rows:
            tables.append(rows)
    return all_text, tables


def source_fields(path: str, modified: datetime, text: str, blob: bytes = b"") -> dict[str, str]:
    parts = path.split("/")
    filename = parts[-1]
    product = parts[2] if len(parts) > 3 else ""
    if product.lower().endswith('.docx'):
        product = ""  # Root-level filenames are not canonical product names.
    folder_tokens = parts[3:-1]
    method_folder = next((token for token in folder_tokens if key(token) in {"accupoint", "spcmy"}), "")
    method = "Accupoint" if "accupoint" in key(path + " " + text) else ("SPC/MY" if "spcmy" in key(path + " " + text) else "")
    process_match = re.search(r"Cleaning Validation of\s+(Compounding|Filling)\s+Area", text, re.I)
    process = process_match.group(1).title() if process_match else next((token for token in folder_tokens if key(token) in {"compounding", "filling", "weighingcompounding"}), "")
    batches = sorted({item.upper() for item in BATCH.findall(path + " " + text)})
    return {
        "archive_path": path,
        "archive_modified_at": modified.isoformat(),
        "archive_sha256": hashlib.sha256(blob).hexdigest() if blob else "",
        "product": product,
        "archive_method_folder": method_folder,
        "process_area": process,
        "method": method,
        "batch_candidates": " | ".join(batches),
        "document_name": filename,
        "header_ml_candidates": " | ".join(sorted(set(re.findall(r"\bML-EM-\d{2}-\d+\b", text, re.I)))),
        "document_text": text,
    }


def event_rows(document: dict[str, str], tables: list[list[list[str]]]) -> list[dict[str, str]]:
    events = []
    for table in tables:
        for i, row in enumerate(table):
            labels = " ".join(key(cell) for cell in row)
            if not ("area" in labels and "result" in labels and ("standard" in labels or "specification" in labels)):
                continue
            previous_location = ""
            for data in table[i + 1:]:
                padded = data + [""] * (5 - len(data))
                if len(data) < 3:
                    continue
                location = padded[1] or previous_location
                result = padded[3] if len(data) >= 4 else ""
                remark = padded[4] if len(data) >= 5 else ""
                if not location or key(location) in {"area", "analysisdesired"}:
                    continue
                previous_location = location
                event = {key_: value for key_, value in document.items() if key_ != "document_text"}
                event.update({
                    "activity_location": location,
                    "standard_specification": padded[2],
                    "observed_reading": result,
                    "document_remark": remark,
                    "activity_classification": "archived swabbing activity; not an analytical sample result",
                })
                events.append(event)
            break
    return events


def logbook_rows(export: dict) -> list[dict[str, str]]:
    rows = []
    for item in export["rows"]:
        values = list(item["values"]) + [""] * len(HEADERS)
        row = {field: clean(values[index]) for index, field in enumerate(HEADERS)}
        row.update({"tab": item["tab"], "sheet_id": item["sheetId"], "sheet_row": item["row"]})
        if re.fullmatch(r"ML-EM-\d{2}-\d+", row["ml_number"], re.I):
            rows.append(row)
    return rows


def score_match(event: dict[str, str], row: dict[str, str], approved_aliases: dict | None = None) -> tuple[int, list[str]]:
    scores, evidence = [], []
    candidates = [candidate.strip() for candidate in event["batch_candidates"].split("|") if candidate.strip()]
    if candidates and key(row["batch"]) in {key(candidate) for candidate in candidates}:
        scores.append(8); evidence.append("batch")
    event_product, row_product = key(event["product"]), key(row["product"])
    if event_product and event_product == row_product:
        scores.append(5); evidence.append("product-exact")
    elif any(key(alias)==row_product for alias in (approved_aliases or {}).get(event_product, [])):
        scores.append(5); evidence.append("product-approved-alias")
    else:
        event_tokens = set(re.findall(r"[a-z0-9]+", event["product"].lower())) - {"s", "for", "the", "and"}
        row_tokens = set(re.findall(r"[a-z0-9]+", row["product"].lower())) - {"s", "for", "the", "and"}
        overlap = event_tokens & row_tokens
        if len(overlap) >= 2 or ("omega" in event_tokens and "opk" in row_tokens):
            scores.append(4); evidence.append("product-name-candidate")
    if key(event["process_area"]) and key(event["process_area"]) == key(row["area"]):
        scores.append(3); evidence.append("area")
    if event["method"] == "Accupoint" and row["accupoint_samplers"]:
        scores.append(1); evidence.append("method")
    return sum(scores), evidence


def reconcile(events: list[dict[str, str]], rows: list[dict[str, str]], approved_aliases: dict | None = None) -> list[dict[str, str]]:
    by_batch: dict[str, list[dict[str, str]]] = defaultdict(list)
    by_product: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        if key(row["batch"]):
            by_batch[key(row["batch"])].append(row)
        if key(row["product"]):
            by_product[key(row["product"])].append(row)
    resolved = []
    for event in events:
        batch_keys = {key(candidate) for candidate in event["batch_candidates"].split("|") if key(candidate)}
        candidates = {id(row): row for batch in batch_keys for row in by_batch.get(batch, [])}
        if key(event["product"]):
            candidates.update({id(row): row for row in by_product.get(key(event["product"]), [])})
        ranked = []
        for row in candidates.values():
            score, evidence = score_match(event, row, approved_aliases)
            if score:
                ranked.append((score, evidence, row))
        ranked.sort(key=lambda item: item[0], reverse=True)
        output = dict(event)
        if not ranked:
            output.update({"match_status": "unmatched", "match_score": 0, "match_evidence": "", "matched_ml_number": "", "matched_logbook_ref": ""})
        else:
            best_score, evidence, best = ranked[0]
            same_best = [candidate for candidate in ranked if candidate[0] == best_score]
            ml_candidates={key(value) for value in event.get("header_ml_candidates", "").split("|") if key(value)}
            corroborated="batch" in evidence and "area" in evidence and any(value in evidence for value in ["product-exact", "product-approved-alias"])
            identifier_agrees=not ml_candidates or ml_candidates=={key(best["ml_number"])}
            status = "matched" if best_score >= 13 and len(same_best) == 1 and corroborated and identifier_agrees else "review"
            output.update({
                "match_status": status,
                "match_score": best_score,
                "match_evidence": " + ".join(evidence),
                "matched_ml_number": best["ml_number"],
                "matched_logbook_ref": f"{best['tab']}!A{best['sheet_row']}:R{best['sheet_row']}",
            })
        resolved.append(output)
    return resolved


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    fields = sorted({field for row in rows for field in row})
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader(); writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", required=True)
    parser.add_argument("--logbook", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--aliases", help="Owner-approved JSON map of archive product names to accepted logbook names")
    args = parser.parse_args()
    approved_aliases={}
    if args.aliases:
        values=json.loads(Path(args.aliases).read_text(encoding="utf-8"))
        if not isinstance(values,dict) or any(not isinstance(names,list) or any(not isinstance(name,str) for name in names) for names in values.values()):raise ValueError("Aliases must map product names to lists of approved names")
        approved_aliases={key(name):names for name,names in values.items()}
    output = Path(args.output); output.mkdir(parents=True, exist_ok=True)
    with open(args.logbook, encoding="utf-8") as handle:
        export = json.load(handle)
    documents, events, failures = [], [], []
    with zipfile.ZipFile(args.archive) as archive:
        for info in archive.infolist():
            path = info.filename
            if not (path.startswith("PF- Environmental Monitoring/2026/") and path.lower().endswith(".docx") and not Path(path).name.startswith("~$")):
                continue
            try:
                blob = archive.read(info)
                text, tables = docx_tables(blob)
                document = source_fields(path, datetime(*info.date_time), text, blob)
                documents.append({key_: value for key_, value in document.items() if key_ != "document_text"})
                events.extend(event_rows(document, tables))
            except Exception as error:  # preserve all failures for controlled manual review
                failures.append({"archive_path": path, "error": str(error)})
    log_rows = logbook_rows(export)
    reconciled = reconcile(events, log_rows, approved_aliases)
    write_csv(output / "archive-document-manifest.csv", documents)
    write_csv(output / "archive-swabbing-activities.csv", reconciled)
    write_csv(output / "reporting-high-confidence-activities.csv", [row for row in reconciled if row["match_status"] == "matched"])
    write_csv(output / "logbook-activity-rows.csv", log_rows)
    write_csv(output / "parse-exceptions.csv", failures)
    summary = {
        "archive": args.archive,
        "logbook_title": export["title"],
        "logbook_spreadsheet_id": export["spreadsheetId"],
        "documents": len(documents), "swabbing_activities": len(events), "logbook_rows": len(log_rows),
        "matches": Counter(row["match_status"] for row in reconciled),
        "documents_by_product_method": Counter(f"{row['product']} | {row['method'] or 'unclassified'}" for row in documents),
        "activities_by_method": Counter(row["method"] or "unclassified" for row in events),
        "parse_exceptions": len(failures),
        "governance": "Archive readings are evidence of swabbing activity. They are not imported as analytical sample results.",
    }
    (output / "baseline-summary.json").write_text(json.dumps(summary, indent=2, default=lambda value: dict(value)), encoding="utf-8")
    print(json.dumps(summary, indent=2, default=lambda value: dict(value)))


if __name__ == "__main__":
    main()
