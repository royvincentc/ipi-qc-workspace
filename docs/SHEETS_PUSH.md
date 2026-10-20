# Google Sheets Push Integration Guide

## Overview

The Google Sheets push integration is a fail-safe, one-way synchronization mechanism from Google Sheets into the IPI QC application database. When active Google Sheets API pull connections are unavailable, firewalled, or experience intermittent API quota limits, this bound Google Apps Script pushes monthly logbook snapshots directly to the server endpoint `POST /api/integrations/sheets/push`.

### Key Architectural & Security Principles

1. **Read-Only Sheet Access**: The Apps Script is strictly read-only. It reads cell display values, dimensions, and merged cell ranges. It never modifies cells, formatting, or sheet metadata.
2. **HMAC-SHA256 Payload Signing**: Every push is signed using HMAC-SHA256 over `${timestamp}.${rawJson}`. The server verifies signatures with a 5-minute replay window (`Math.abs(now - timestamp) <= 300000 ms`).
3. **Isolated Secrets**: The secret key is stored exclusively on the server (`SHEETS_PUSH_SECRET` environment variable on Render) and in Google Apps Script Script Properties (`IPI_SYNC_SECRET`). No database credentials or service accounts ever touch Google Sheets or the script.
4. **HTTPS & Route Enforcement**: The script validates that the destination URL is HTTPS and strictly targets `/api/integrations/sheets/push` (defaulting to `https://ipi-qc.onrender.com/api/integrations/sheets/push`).
5. **Exact Layout & Size Limits**: The payload preserves displayed values, trims trailing empty cells and rows, and enforces server bounds: maximum 5,000 rows and 153 columns (columns A through EW).
6. **Snapshot Timestamp Precedes Reads**: Timestamp is captured before reading values (`getDisplayValues()`) and merges (`Range.getMergedRanges()`), ensuring server observedAt ordering is preserved and rejecting pushes captured before newer saved source snapshots.

---

## Step-by-Step Installation & Deployment

### Step 1: Generate Cryptographically Secure Secret

Generate a random secret of at least 32 characters (recommended: 64 hexadecimal characters):

```bash
# Using OpenSSL:
openssl rand -hex 32

# Or using Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this secret securely. It will be shared only between Render and Google Apps Script Script Properties.

---

### Step 2: Configure Render Environment & Verify Endpoint

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Open the **ipi-qc** web service.
3. Navigate to the **Environment** tab.
4. Add or update the environment variable:
   - **Key**: `SHEETS_PUSH_SECRET`
   - **Value**: `<your-generated-secret-from-step-1>`
5. Click **Save Changes** and wait for deployment to complete.
6. Verify that the server endpoint `POST /api/integrations/sheets/push` is active (defined in `server/sheets-push.ts`).

---

### Step 3: Install Apps Script in Google Sheets

1. Open the target monthly logbook spreadsheet in Google Sheets.
2. In the top menu, navigate to **Extensions** > **Apps Script**.
3. In the Apps Script project editor:
   - Click the **+** icon next to **Files** and select **Script** to create a new script file (e.g. `IpiPush.gs`). Do not overwrite `Code.gs` or existing project scripts.
   - Copy and paste the entire content of `scripts/sheets-push.gs` into `IpiPush.gs`.
   - **Preserve Existing `onOpen`**: If another file already has an `onOpen()` function, remove the three-line `onOpen()` wrapper from the pasted script. Add `addIpiSyncMenu();` inside the existing handler instead. Keep its other code.
   - Click **Save project** (disk icon or `Ctrl+S`).

Repeat the script installation, properties, manual test, and trigger setup in each configured logbook workbook that needs the fallback. The incoming and environmental logbooks are separate workbooks; installing a bound script in one does not cover the other.

---

### Step 4: Configure Apps Script Properties

1. In the Apps Script left navigation panel, click **Project Settings** (gear icon).
2. Scroll down to the **Script Properties** section.
3. Click **Add script property**:
   - **Property**: `IPI_SYNC_SECRET`
   - **Value**: `<your-generated-secret-from-step-1>`
4. *(Optional)* Add custom destination URL if not using default:
   - **Property**: `IPI_SYNC_URL`
   - **Value**: `https://ipi-qc.onrender.com/api/integrations/sheets/push`
5. Click **Save script properties**.

*Security Warning on Script Properties*: In Google Sheets, Script Properties are accessible to anyone who has **Editor** permissions on the bound spreadsheet (any spreadsheet editor can open Extensions > Apps Script and inspect project settings via [Apps Script Properties](https://developers.google.com/apps-script/guides/properties)). Restrict spreadsheet Editor permissions to authorized laboratory administrators only; assign **Viewer** or **Commenter** roles to general users to protect `IPI_SYNC_SECRET`.

---

### Step 5: Verify Spreadsheet Timezone

The auto-detection for the current monthly tab (e.g. `October 2026`) relies on the spreadsheet's configured timezone.

1. In Google Sheets, click **File** > **Settings**.
2. Under the **Calculation** / **General** tab, check the **Time zone**.
3. Ensure it matches the laboratory timezone: `(GMT+08:00) Philippines Standard Time` (`Asia/Manila`).
4. Click **Save settings**.

---

### Step 6: Perform Manual Test Push

1. Select the active monthly tab in Google Sheets (e.g., `October 2026`).
2. Reload the spreadsheet page in your browser. A custom menu named **IPI Sync** will appear in the toolbar.
3. Click **IPI Sync** > **Push Active Monthly Tab** (or in the Apps Script editor, choose `pushActiveSheet` from the function dropdown and click **Run**).
4. **Authorization**: On first run, Google will display an **Authorization Required** dialog:
   - Click **Review permissions**.
   - Choose your Google account.
   - Review the requested spreadsheet, external-request, and trigger permissions for this project. The supplied code only reads sheet data. Authorize it using an account you control; if your organization blocks authorization, contact its administrator.
5. In Apps Script, open the **Execution log** (or bottom console) and verify:
   - `IPI Push SUCCESS [October 2026]: HTTP 200, count=..., errors=0`
   - Alternatively, HTTP 207 indicates a partial sync with errors (e.g., conflicting ML numbers or unmapped section headers).

---

### Step 7: Check the 20 October Breakdown

After deploying the parser fix, refresh the dashboard and select 20 October 2026. Check the chart and sample log against these expected receipt counts:
- **Total Receipts**: 15
  - **Semi-Finished Goods (SFG)**: 1 receipt
  - **Finished Goods (FG)**: 4 receipts
  - **Raw Material (RM)**: 1 receipt
  - **Water (WS)**: 9 receipts

*Root Cause & Reconciliation*:
All nine WATER rows were already in the database with received timestamp `'10/20/2026 @ 08: 46 AM'`. The parser fix accepts that spacing. The separate existing `ML-WS-26-1560` October row 86 identity conflict is preserved; a push that encounters it returns HTTP 207 (Multi-Status / partial sync) with conflict details recorded in `IPI_LAST_STATUS` until reconciled.

---

### Step 8: Install 15-Minute Automated Trigger & Troubleshooting

1. In Google Sheets, click **IPI Sync** > **Install 15-Minute Auto-Push** (or in Apps Script editor, run `installTrigger()`).
2. `installTrigger()` performs two vital actions (using [ClockTriggerBuilder](https://developers.google.com/apps-script/reference/script/clock-trigger-builder) `everyMinutes(15)`):
   - Saves the spreadsheet ID in script property `IPI_SPREADSHEET_ID`, enabling time-driven triggers to reliably locate and open the spreadsheet in background headless contexts.
   - Checks existing project triggers and deletes previous instances of `pushCurrentMonth` before installing the new 15-minute time trigger. It never deletes or alters triggers belonging to other functions.
   - *Note*: Installable triggers execute under the account of the user who installs them.
3. **Checking Executions**:
   - In Apps Script, click the **Executions** tab (play list icon on the left bar).
   - Review past executions, run durations, and error logs. Delivery takes longer if the server is waking or the snapshot is large.

---

## Error Handling & Troubleshooting Reference

| HTTP Status / Error | Cause | Resolution |
|---|---|---|
| `401 Invalid or expired Sheets push signature` | Secret mismatch or timestamp older than 5 minutes | Verify `IPI_SYNC_SECRET` in Script Properties exactly matches `SHEETS_PUSH_SECRET` on Render. Check server and system time sync. |
| `403 This workbook is not a configured logbook` | Spreadsheet ID not recognized by IPI | Ensure the spreadsheet URL is registered in IPI Settings > Connections (`incoming` or `environmental`). |
| `Monthly sheet exceeds the reviewed 5,000-row limit` | Sheet grid dimensions exceed reviewed safety limits; the script stops before sending | Have an administrator review the grid and the integration limit. Back up the workbook before changing its layout; do not move existing source records just to bypass the limit. |
| `409 This snapshot predates newer source records` | A newer dashboard sync or intake finished after the script began reading | Run `pushActiveSheet` again to capture a fresh snapshot. |
| `207 Multi-Status (Partial Failure)` | Payload accepted, but one or more sections had reconciliation conflicts | Review `IPI_LAST_STATUS` in Script Properties or server logs. Conflicting records will be listed in `errors`. |
| `Lock busy (skipped)` | Another push execution is currently in flight | The script waits up to 30 seconds for the lock. If still busy, it exits cleanly without duplicate work. |
| `502 / 503 / 504 / Network Timeout` | Render server sleeping, restarting, or network blip | The script automatically retries up to 3 times with linear backoff using the exact same signed payload. |
