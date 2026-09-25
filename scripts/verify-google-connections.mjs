import 'dotenv/config';
import {GoogleAuth} from 'google-auth-library';
import {PGlite} from '@electric-sql/pglite';

const auth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
});

function googleId(url) {
  const parsed = new URL(url);
  const match = parsed.hostname === 'docs.google.com'
    ? parsed.pathname.match(/^\/spreadsheets\/d\/([\w-]+)/)
    : null;
  if (!match) throw new Error('Saved value is not a Google Sheets link');
  return match[1];
}

function monthOf(name) {
  const match = name.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s*(?:\(ENVI\))?\s+(\d{4})$/i);
  return match ? {month: match[1], year: Number(match[2])} : null;
}

function column(index) {
  let result = '';
  for (let value = index + 1; value; value = Math.floor((value - 1) / 26)) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
  }
  return result;
}

function normalized(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function a1Merge(merge) {
  return `${column(merge.startColumnIndex ?? 0)}${(merge.startRowIndex ?? 0) + 1}:${column(merge.endColumnIndex - 1)}${merge.endRowIndex}`;
}

async function request(url) {
  const client = await auth.getClient();
  return (await client.request({url, timeout: 30000})).data;
}

async function readWorkbook(url) {
  const id = googleId(url);
  const metadata = await request(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=properties(title),sheets(properties,merges)`);
  const sheets = [];
  for (const source of metadata.sheets ?? []) {
    const properties = source.properties;
    if (!monthOf(properties.title)) continue;
    const range = `'${properties.title.replaceAll("'", "''")}'!A1:CW${properties.gridProperties.rowCount}`;
    const values = await request(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`);
    sheets.push({
      name: properties.title,
      rows: values.values ?? [],
      rowCount: properties.gridProperties.rowCount,
      merges: (source.merges ?? []).map(a1Merge),
    });
  }
  if (!sheets.length) throw new Error('No recognized monthly tabs found');
  return {title: metadata.properties.title, sheets};
}

function validateLayout(sheet, type) {
  const issues = [];
  const layout = type.layout;
  const header = sheet.rows[layout.header - 1] ?? [];
  for (let index = 0; index < layout.headers.length; index += 1) {
    if (normalized(header[layout.start + index]) !== normalized(layout.headers[index])) {
      issues.push({sheet: sheet.name, type: type.name, cell: `${column(layout.start + index)}${layout.header}`, expected: layout.headers[index], observed: header[layout.start + index] ?? ''});
    }
  }
  if (!sheet.merges.includes(layout.merge)) issues.push({sheet: sheet.name, type: type.name, boundary: layout.merge, issue: 'Configured section boundary is missing'});
  for (const merge of layout.extraMerges ?? []) if (!sheet.merges.includes(merge)) issues.push({sheet: sheet.name, type: type.name, boundary: merge, issue: 'Configured extra boundary is missing'});
  if (type.register === 'environmental') {
    if (!String(sheet.rows[0]?.[0] ?? '').includes(layout.title)) {
      const observedTopCells = sheet.rows.slice(0, 3)
        .flatMap((row, rowIndex) => row.map((value, columnIndex) => value == null || value === '' ? null : {cell: `${column(columnIndex)}${rowIndex + 1}`, value}))
        .filter(Boolean);
      issues.push({sheet: sheet.name, type: type.name, cell: 'A1', expected: layout.title, observed: sheet.rows[0]?.[0] ?? '', observedTopCells});
    }
  } else if (![layout.title, ...(layout.acceptedTitles ?? [])].map(normalized).includes(normalized(sheet.rows[1]?.[layout.start]))) {
    issues.push({sheet: sheet.name, type: type.name, cell: `${column(layout.start)}2`, expected: layout.title, observed: sheet.rows[1]?.[layout.start] ?? ''});
  }
  return issues;
}

async function checkLogbook(kind, url, sampleTypes) {
  const workbook = await readWorkbook(url);
  const relevant = sampleTypes.filter((type) => type.register === kind);
  const issues = workbook.sheets.flatMap((sheet) => relevant.flatMap((type) => validateLayout(sheet, type)));
  return {ok: issues.length === 0, title: workbook.title, monthlyTabs: workbook.sheets.length, layoutsChecked: workbook.sheets.length * relevant.length, issues};
}

async function checkSpecifications(url, configuration) {
  const id = googleId(url);
  const metadata = await request(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=properties(title),sheets(properties(title))`);
  const tests = configuration.tests.filter((test) => test.sheetHeader && test.sheetColumn != null).sort((a, b) => a.sheetColumn - b.sheetColumn);
  const expectedSheets = [...new Set(configuration.sampleTypes.filter((type) => type.applicability === 'spreadsheet').map((type) => type.applicabilitySheet))];
  let products = 0;
  for (const name of expectedSheets) {
    if (!(metadata.sheets ?? []).some((sheet) => sheet.properties.title === name)) return {ok: false, title: metadata.properties.title, expectedTabs: expectedSheets, observedTabs: (metadata.sheets ?? []).map((sheet) => sheet.properties.title), error: `Missing ${name} specification tab`};
    const end = column(Math.max(1, ...tests.map((test) => test.sheetColumn)));
    const range = `'${name.replaceAll("'", "''")}'!A1:${end}2000`;
    const values = await request(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`);
    const rows = values.values ?? [];
    for (const test of tests) if (String(rows[1]?.[test.sheetColumn] ?? '').trim() !== test.sheetHeader) throw new Error(`${name}: ${test.sheetHeader} applicability header differs from configuration`);
    for (let index = 2; index < rows.length; index += 1) {
      if (!rows[index]?.[0] || rows[index].slice(1).every((value) => value == null || value === '')) continue;
      if (tests.some((test) => typeof rows[index][test.sheetColumn] !== 'boolean')) throw new Error(`${name} row ${index + 1}: applicability value is not a checkbox boolean`);
      products += 1;
    }
  }
  return {ok: true, title: metadata.properties.title, specificationTabs: expectedSheets.length, productRowsChecked: products};
}

const database = new PGlite(process.env.DEMO_DB_PATH ?? '.data/demo-db');
try {
  const settings = await database.query("SELECT key,value FROM settings WHERE key='connections'");
  const configured = settings.rows[0]?.value;
  const configuration = (await database.query('SELECT data FROM configuration WHERE id=1')).rows[0]?.data;
  if (!configured || !configuration) throw new Error('Saved connections or managed configuration are missing');
  for (const type of configuration.sampleTypes) {
    type.layout.acceptedTitles ??= [];
    if (type.id === 'FG' && !type.layout.acceptedTitles.some((title) => normalized(title) === 'finished goods')) type.layout.acceptedTitles.push('Finished Goods');
    if (type.applicabilitySheet === 'RMFPAS') type.applicabilitySheet = 'RM/FP/AS';
  }
  const client = await auth.getClient();
  const credentials = await client.getCredentials();
  const results = {identity: credentials.client_email ?? 'Application Default Credentials'};
  for (const [kind, action] of [
    ['incoming', () => checkLogbook('incoming', configured.incoming, configuration.sampleTypes)],
    ['environmental', () => checkLogbook('environmental', configured.environmental, configuration.sampleTypes)],
    ['specifications', () => checkSpecifications(configured.specifications, configuration)],
  ]) {
    try {
      results[kind] = configured[kind] ? await action() : {ok: false, error: 'No link saved'};
    } catch (error) {
      results[kind] = {ok: false, error: error.response?.status ? `Google API returned ${error.response.status}: ${error.message}` : error.message};
    }
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await database.close();
}
