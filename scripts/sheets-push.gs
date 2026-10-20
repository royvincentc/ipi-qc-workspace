/**
 * IPI Google Sheets Bound Push Script
 * Pushes monthly logbook receipts to POST /api/integrations/sheets/push
 */

var IPI_DEFAULT_URL = 'https://ipi-qc.onrender.com/api/integrations/sheets/push';

function onOpen() {
  addIpiSyncMenu();
}

function addIpiSyncMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('IPI Sync')
      .addItem('Push Active Monthly Tab', 'pushActiveSheet')
      .addItem('Push Current Month Tab', 'pushCurrentMonth')
      .addSeparator()
      .addItem('Install 15-Minute Auto-Push', 'installTrigger')
      .addItem('Uninstall Auto-Push', 'uninstallTrigger')
      .addToUi();
  } catch (e) {
    // getUi() fails in non-interactive/trigger contexts
  }
}

function installTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    PropertiesService.getScriptProperties().setProperty('IPI_SPREADSHEET_ID', ss.getId());
  }
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'pushCurrentMonth') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('pushCurrentMonth')
    .timeBased()
    .everyMinutes(15)
    .create();
  console.log('Installed 15-min periodic trigger for pushCurrentMonth' + (ss ? ' on ' + ss.getId() : ''));
}

function uninstallTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'pushCurrentMonth') {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  console.log('Uninstalled ' + removed + ' trigger(s) for pushCurrentMonth');
}

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty('IPI_SPREADSHEET_ID');
  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (e) {
      console.warn('Failed opening spreadsheet by saved ID (' + savedId + '): ' + e.message);
    }
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty('IPI_SPREADSHEET_ID', active.getId());
    return active;
  }
  throw new Error('Spreadsheet not found. Run installTrigger() from the bound spreadsheet to save its ID.');
}

function monthOf(name) {
  var m = String(name || '').match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s*(?:\(ENVI\))?\s+(\d{4})$/i);
  if (!m) return null;
  var months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  return { month: months.indexOf(m[1].toLowerCase()) + 1, year: Number(m[2]) };
}

function currentMonthYear(now, timeZone) {
  var parts = Utilities.formatDate(now, timeZone, 'yyyy-MM').split('-');
  return { year: Number(parts[0]), month: Number(parts[1]) };
}

function pushActiveSheet() {
  var ss = getSpreadsheet_();
  var sheet = ss.getActiveSheet();
  if (!sheet) throw new Error('No active sheet selected');
  return pushSheet(ss, sheet);
}

function pushCurrentMonth() {
  var ss = getSpreadsheet_();
  var timeZone = ss.getSpreadsheetTimeZone() || 'Asia/Manila';
  var cur = currentMonthYear(new Date(), timeZone);
  var sheets = ss.getSheets();
  var target = null;
  for (var i = 0; i < sheets.length; i++) {
    var d = monthOf(sheets[i].getName());
    if (d && d.month === cur.month && d.year === cur.year) {
      target = sheets[i];
      break;
    }
  }
  if (!target) {
    var msg = 'No monthly logbook tab found for ' + cur.year + '-' + (cur.month < 10 ? '0' : '') + cur.month + ' in timezone ' + timeZone;
    console.warn(msg);
    var status = {
      timestamp: new Date().toISOString(),
      sheetName: null,
      statusCode: 0,
      count: 0,
      errors: [msg],
      success: false
    };
    PropertiesService.getScriptProperties().setProperty('IPI_LAST_STATUS', JSON.stringify(status));
    return status;
  }
  return pushSheet(ss, target);
}

function pushSheet(ss, sheet) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    console.warn('Script lock busy; another push execution is running');
    return { skipped: true, reason: 'lock_busy' };
  }
  try {
    return executePush_(ss, sheet);
  } finally {
    lock.releaseLock();
  }
}

function executePush_(ss, sheet) {
  var name = sheet.getName();
  if (!monthOf(name)) {
    throw new Error("Sheet '" + name + "' is not a recognized monthly logbook tab (e.g. 'October 2026').");
  }

  var props = PropertiesService.getScriptProperties();
  var secret = (props.getProperty('IPI_SYNC_SECRET') || '').trim();
  if (!secret || secret.length < 32) {
    throw new Error('IPI_SYNC_SECRET must be configured and at least 32 characters long.');
  }

  var url = (props.getProperty('IPI_SYNC_URL') || IPI_DEFAULT_URL).trim();
  if (!/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?\/api\/integrations\/sheets\/push$/.test(url)) {
    throw new Error('Invalid IPI_SYNC_URL: must be HTTPS and route /api/integrations/sheets/push');
  }

  var rowCount = sheet.getMaxRows();
  if (rowCount > 5000) {
    throw new Error('Monthly sheet exceeds the reviewed 5,000-row limit: ' + rowCount);
  }

  // Reject this capture if a newer server import finishes while these reads run.
  var timestamp = String(Date.now());

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastCol > 153) {
    throw new Error('Populated columns exceed the 153-column limit (columns A:EW): ' + lastCol);
  }
  var rows = [];

  if (lastRow > 0 && lastCol > 0) {
    var displayValues = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
    for (var r = 0; r < displayValues.length; r++) {
      var row = displayValues[r];
      var trimmedRow = [];
      for (var c = 0; c < row.length; c++) {
        var val = String(row[c] == null ? '' : row[c]);
        if (val.length > 10000) {
          throw new Error('Cell value exceeds 10,000 characters at row ' + (r + 1) + ', column ' + (c + 1));
        }
        trimmedRow.push(val);
      }
      while (trimmedRow.length > 0 && trimmedRow[trimmedRow.length - 1] === '') {
        trimmedRow.pop();
      }
      rows.push(trimmedRow);
    }
    while (rows.length > 0 && rows[rows.length - 1].length === 0) {
      rows.pop();
    }
  }

  if (rowCount < rows.length) rowCount = rows.length;
  if (rowCount < 1) rowCount = 1;

  var mergeCols = Math.min(sheet.getMaxColumns() || 1, 153);
  var mergesRange = sheet.getRange(1, 1, rowCount, mergeCols);
  var mergedRanges = mergesRange.getMergedRanges();
  var merges = [];
  var seenMerges = {};
  for (var m = 0; m < mergedRanges.length; m++) {
    var a1 = mergedRanges[m].getA1Notation().replace(/^.*!/, '');
    if (/^[A-Z]+\d+:[A-Z]+\d+$/.test(a1) && !seenMerges[a1]) {
      seenMerges[a1] = true;
      merges.push(a1);
    }
  }
  if (merges.length > 1000) {
    throw new Error('Merged cell ranges exceed the 1,000 limit: ' + merges.length);
  }

  var payload = {
    spreadsheetId: ss.getId(),
    sheet: {
      id: Number(sheet.getSheetId()),
      name: name,
      rowCount: Number(rowCount),
      rows: rows,
      merges: merges
    }
  };

  var rawJson = JSON.stringify(payload);
  var message = timestamp + '.' + rawJson;
  var sigBytes = Utilities.computeHmacSha256Signature(message, secret);
  var signature = sigBytes.map(function(b) {
    var hex = (b < 0 ? b + 256 : b).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toLowerCase();

  var fetchOptions = {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    payload: rawJson,
    headers: {
      'X-IPI-Timestamp': timestamp,
      'X-IPI-Signature': signature
    },
    muteHttpExceptions: true
  };

  // shortcut: 3 transient attempts with fixed linear backoff, upgrade to jittered exponential if scale exceeds logbook frequency
  var maxAttempts = 3;
  var response = null;
  var fetchErr = null;
  var code = 0;
  var text = '';

  for (var attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      fetchErr = null;
      response = UrlFetchApp.fetch(url, fetchOptions);
      code = response.getResponseCode();
      text = response.getContentText();
      if (code === 200 || code === 207) {
        break;
      }
      if ((code >= 500 || code === 429) && attempt < maxAttempts) {
        Utilities.sleep(1000 * attempt);
        continue;
      }
      break;
    } catch (err) {
      fetchErr = err;
      if (attempt < maxAttempts) {
        Utilities.sleep(1000 * attempt);
        continue;
      }
    }
  }

  var parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (e) {}

  var count = (parsed && typeof parsed.count === 'number') ? parsed.count : 0;
  var errors = (parsed && Array.isArray(parsed.errors)) ? parsed.errors : [];
  if (code !== 200 && code !== 207 && errors.length === 0) {
    errors = [(parsed && (parsed.message || parsed.error)) || (fetchErr ? fetchErr.message : ('HTTP ' + code + ': ' + text.slice(0, 200)))];
  }

  var status = {
    timestamp: new Date().toISOString(),
    sheetName: name,
    sheetId: sheet.getSheetId(),
    statusCode: code,
    count: count,
    errors: errors,
    success: code === 200
  };

  props.setProperty('IPI_LAST_STATUS', JSON.stringify(status));
  console.log('IPI Push ' + (code === 200 ? 'SUCCESS' : code === 207 ? 'PARTIAL' : 'FAILED') +
    ' [' + name + ']: HTTP ' + code + ', count=' + count + ', errors=' + errors.length);

  if (code !== 200 && code !== 207) {
    if (fetchErr && !code) throw fetchErr;
    throw new Error('IPI push failed (HTTP ' + code + '): ' + errors.join('; '));
  }

  return status;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    monthOf: monthOf,
    currentMonthYear: currentMonthYear,
    pushSheet: pushSheet,
    pushActiveSheet: pushActiveSheet,
    pushCurrentMonth: pushCurrentMonth,
    installTrigger: installTrigger,
    uninstallTrigger: uninstallTrigger,
    onOpen: onOpen,
    IPI_DEFAULT_URL: IPI_DEFAULT_URL
  };
}
