# Google Sheet read-only cross-check

**Spreadsheet:** [MICRO-QC Environmental Monitoring Logbook 2026](https://docs.google.com/spreadsheets/d/1rDbum4U-u_c5lEyGX0MiytmLzdIXbiiPcNezGCKbtsc/edit)

**Access check:** read-only metadata and bounded range/search calls succeeded after the owner updated permissions. No Sheet cells or Drive files were changed.

## Tabs observed

The workbook contains monthly Environmental Monitoring tabs for January through October 2026, plus `RAW` and `DR. S. Wong's Apple Drink`. The provided `gid=507425896` resolves to `September(ENVI) 2026`.

The `October (ENVI) 2026` tab's first visible cell still says `SEPTEMBER 2026`. That appears to be a stale sheet title; confirm the intended month before relying on the label.

## Header row and unlabeled value

The visible header is on row 4. Its populated fields include `DATE RECEIVED`, `FACILITY`, `ML Number`, `PRODUCT`, `Area`, `Category`, `BATCH NO.`, `AREA/EQUIPMENT MONITORED`, `ACCUPOINT SAMPLERS USED`, `PLATES USED`, `RECEIVED BY`, `ANALYZED BY`, `PROCEED BY / READ BY:`, `DATE ANALYZED`, `DATE RELEASED`, `STATUS`, and `REMARKS`.

Column G is blank in the header row, but the requested record has `N/A` in column G. Do not map this value into a generated report until the owner identifies the field meaning.

## Requested ML row

`ML-EM-26-0488` is row 74 of `September(ENVI) 2026`:

| Field | Value |
|---|---|
| Date received | 09/25/2026 @09:03 AM |
| Facility | PF2 |
| Product | Mama's Love Baby Oil (P) |
| Area / process | Compounding |
| Category | Regular |
| Unlabeled column G | N/A |
| Batch | CYI47 |
| Area/equipment monitored | 2 |
| Accupoint samplers used | 2 |
| Plates used | 4 |
| Received by | Aryan |
| Analyzed by | Aryan |
| Date analyzed | 09/25/2026 |
| Date released | blank |
| Status | ON-GOING |
| Remarks | blank |

This row gives an equipment/area count of `2`, not the names of the sampling locations, result readings, criteria, remarks, or signatories. Those report rows must come from a separately controlled product sampling plan, with actual analytical results entered manually. The ongoing status and blank release date must not be presented as a released report.
