import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleAuth } from 'google-auth-library';
import { PGlite } from '@electric-sql/pglite';

const output = process.argv[2] ?? 'output/environmental-monitoring-baseline/logbook-rows.json';
const database = new PGlite(process.env.DEMO_DB_PATH ?? '.data/demo-db');

try {
  const configured = (await database.query("SELECT value FROM settings WHERE key='connections'")).rows[0]?.value;
  if (!configured?.environmental) throw new Error('No environmental monitoring logbook is configured.');
  const match = new URL(configured.environmental).pathname.match(/^\/spreadsheets\/d\/([\w-]+)/);
  if (!match) throw new Error('Configured environmental logbook is not a Google Sheets URL.');

  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const client = await auth.getClient();
  const id = match[1];
  const metadata = (await client.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=properties(title),sheets(properties(sheetId,title,gridProperties))`,
    timeout: 30000,
  })).data;
  const tabs = (metadata.sheets ?? []).map((sheet) => sheet.properties).filter((sheet) => /^(January|February|March|April|May|June|July|August|September|October|November|December)\s*(?:\(ENVI\))?\s+2026$/i.test(sheet.title));
  const rows = [];
  for (const tab of tabs) {
    const safeName = tab.title.replaceAll("'", "''");
    const data = (await client.request({
      url: `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(`'${safeName}'!A1:R${tab.gridProperties.rowCount}`)}?valueRenderOption=FORMATTED_VALUE`,
      timeout: 30000,
    })).data.values ?? [];
    const header = data[3] ?? [];
    for (let index = 4; index < data.length; index += 1) {
      const values = data[index] ?? [];
      if (values.every((value) => String(value ?? '').trim() === '')) continue;
      if (String(values[0] ?? '').trim().toLowerCase() === 'reports generated') break;
      rows.push({ tab: tab.title, sheetId: tab.sheetId, row: index + 1, header, values });
    }
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify({ title: metadata.properties.title, spreadsheetId: id, exportedAt: new Date().toISOString(), tabs, rows }, null, 2));
  console.log(JSON.stringify({ title: metadata.properties.title, tabs: tabs.length, nonEmptyRows: rows.length, output }, null, 2));
} finally {
  await database.close();
}
