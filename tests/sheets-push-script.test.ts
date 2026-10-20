import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHmac} from 'node:crypto';
import vm from 'node:vm';
import {verifySheetsPush} from '../server/sheets-push.js';

const scriptPath = fileURLToPath(new URL('../scripts/sheets-push.gs', import.meta.url));
const scriptSource = readFileSync(scriptPath, 'utf8');

interface MockSheetDef {
  id: number;
  name: string;
  maxRows?: number;
  maxCols?: number;
  values?: string[][];
  merges?: string[];
}

interface GasEnvOptions {
  secret?: string;
  url?: string;
  spreadsheetId?: string;
  timeZone?: string;
  sheets?: MockSheetDef[];
  activeSheetIndex?: number;
  fetchHandler?: (url: string, options: any, attempt: number) => { getResponseCode: () => number; getContentText: () => string };
  lockAcquired?: boolean;
  now?: () => Date;
  eventTrace?: string[];
}

function createGasEnvironment(options: GasEnvOptions = {}) {
  const secret = options.secret ?? 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
  const url = options.url;
  const spreadsheetId = options.spreadsheetId ?? 'test-workbook-102026';
  const timeZone = options.timeZone ?? 'Asia/Manila';
  const sheetsDef = options.sheets ?? [
    {
      id: 10,
      name: 'October 2026',
      maxRows: 100,
      maxCols: 20,
      values: [
        ['', ''],
        ['Semi-Finished Goods', '', ''],
        ['Date Received', 'Sample Name', 'ML Number'],
        ['10/20/2026', 'Syrup', 'ML-SFG-26-0001']
      ],
      merges: ['A2:T2']
    }
  ];

  const properties: Record<string, string> = {
    IPI_SYNC_SECRET: secret
  };
  if (url) {
    properties.IPI_SYNC_URL = url;
  }

  const scriptProperties = {
    getProperty: (key: string) => properties[key] ?? null,
    setProperty: (key: string, value: string) => { properties[key] = String(value); },
    getProperties: () => ({ ...properties })
  };

  let lockTaken = false;
  const scriptLock = {
    tryLock: () => {
      if (options.lockAcquired === false || lockTaken) return false;
      lockTaken = true;
      return true;
    },
    releaseLock: () => {
      lockTaken = false;
    }
  };

  const triggers: { id: string; handler: string }[] = [];
  const ScriptApp = {
    getProjectTriggers: () => triggers.map(t => ({
      getHandlerFunction: () => t.handler,
      _id: t.id
    })),
    deleteTrigger: (trig: any) => {
      const idx = triggers.findIndex(t => t.id === trig._id);
      if (idx >= 0) triggers.splice(idx, 1);
    },
    newTrigger: (handler: string) => ({
      timeBased: () => ({
        everyMinutes: () => ({
          create: () => {
            const t = { id: 'trig_' + (triggers.length + 1), handler };
            triggers.push(t);
            return t;
          }
        })
      })
    })
  };

  const mockSheets = sheetsDef.map(def => {
    const maxRows = def.maxRows ?? 500;
    const maxCols = def.maxCols ?? 50;
    const rawValues = def.values ?? [];
    return {
      getName: () => def.name,
      getSheetId: () => def.id,
      getMaxRows: () => maxRows,
      getMaxColumns: () => maxCols,
      getLastRow: () => rawValues.length,
      getLastColumn: () => Math.max(0, ...rawValues.map(r => r.length)),
      getRange: (r: number, c: number, numRows: number, numCols: number) => {
        options.eventTrace?.push('getRange');
        return {
          getDisplayValues: () => {
            options.eventTrace?.push('getDisplayValues');
            const out: string[][] = [];
            for (let i = 0; i < numRows; i++) {
              const row: string[] = [];
              for (let j = 0; j < numCols; j++) {
                row.push(rawValues[r - 1 + i]?.[c - 1 + j] ?? '');
              }
              out.push(row);
            }
            return out;
          },
          getMergedRanges: () => {
            options.eventTrace?.push('getMergedRanges');
            return (def.merges ?? []).map(a1 => ({
              getA1Notation: () => a1
            }));
          }
        };
      }
    };
  });

  let activeIdx = options.activeSheetIndex ?? 0;
  const mockSpreadsheet = {
    getId: () => spreadsheetId,
    getSpreadsheetTimeZone: () => timeZone,
    getActiveSheet: () => mockSheets[activeIdx] ?? null,
    getSheets: () => mockSheets,
    setActiveSheet: (sheet: any) => {
      activeIdx = mockSheets.indexOf(sheet);
    }
  };

  const SpreadsheetApp = {
    getActiveSpreadsheet: () => mockSpreadsheet,
    openById: (id: string) => {
      if (id === spreadsheetId) return mockSpreadsheet;
      throw new Error('Spreadsheet not found for ID: ' + id);
    },
    getUi: () => ({
      createMenu: () => ({
        addItem: function() { return this; },
        addSeparator: function() { return this; },
        addToUi: function() { return this; }
      })
    })
  };

  const Utilities = {
    computeHmacSha256Signature: (message: string, key: string) => {
      const hmac = createHmac('sha256', key).update(message).digest();
      return Array.from(hmac).map(b => b > 127 ? b - 256 : b);
    },
    sleep: () => {},
    formatDate: (date: Date, tz: string, format: string) => {
      const parts = new Intl.DateTimeFormat('en', { timeZone: tz, year: 'numeric', month: '2-digit' }).formatToParts(date);
      const y = parts.find(p => p.type === 'year')!.value;
      const m = parts.find(p => p.type === 'month')!.value;
      return format === 'yyyy-MM' ? `${y}-${m}` : `${y}-${m}`;
    }
  };

  const fetchCalls: { url: string; options: any }[] = [];
  const defaultFetchHandler = () => ({
    getResponseCode: () => 200,
    getContentText: () => JSON.stringify({ count: 1, errors: [] })
  });

  const UrlFetchApp = {
    fetch: (fetchUrl: string, fetchOptions: any) => {
      fetchCalls.push({ url: fetchUrl, options: fetchOptions });
      const handler = options.fetchHandler ?? defaultFetchHandler;
      return handler(fetchUrl, fetchOptions, fetchCalls.length);
    }
  };

  const sandbox: Record<string, any> = {
    console,
    Intl,
    Date: class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0 && options.now) {
          super(options.now!().getTime());
        } else {
          // @ts-ignore
          super(...args);
        }
      }
      static now() {
        options.eventTrace?.push('Date.now');
        return options.now ? options.now().getTime() : Date.now();
      }
    },
    PropertiesService: {
      getScriptProperties: () => scriptProperties
    },
    LockService: {
      getScriptLock: () => scriptLock
    },
    ScriptApp,
    SpreadsheetApp,
    Utilities,
    UrlFetchApp,
    module: { exports: {} }
  };

  vm.createContext(sandbox);
  vm.runInContext(scriptSource, sandbox);

  return {
    sandbox,
    exports: sandbox.module.exports,
    fetchCalls,
    properties,
    triggers,
    mockSpreadsheet,
    mockSheets
  };
}

test('payload construction and HMAC-SHA256 signature pass server verifySheetsPush', () => {
  const secret = 'super-secret-key-that-is-at-least-32-bytes-long';
  const env = createGasEnvironment({
    secret,
    sheets: [
      {
        id: 101,
        name: 'October 2026',
        maxRows: 50,
        maxCols: 20,
        values: [
          ['Title Header'],
          ['Semi-Finished Goods', '', ''],
          ['Date Received', 'Sample Name', 'ML Number'],
          ['10/20/2026', 'Syrup', 'ML-SFG-26-0001']
        ],
        merges: ['A2:T2']
      }
    ]
  });

  const status = env.exports.pushActiveSheet();
  assert.equal(status.success, true);
  assert.equal(env.fetchCalls.length, 1);

  const call = env.fetchCalls[0];
  assert.equal(call.url, 'https://ipi-qc.onrender.com/api/integrations/sheets/push');
  assert.equal(call.options.method, 'post');
  assert.equal(call.options.contentType, 'application/json; charset=utf-8');

  const timestamp = call.options.headers['X-IPI-Timestamp'];
  const signature = call.options.headers['X-IPI-Signature'];
  assert.match(timestamp, /^\d{13}$/);
  assert.match(signature, /^[a-f0-9]{64}$/);

  const rawBody = Buffer.from(call.options.payload, 'utf8');
  // Verify against real server-side verifySheetsPush
  assert.doesNotThrow(() => {
    verifySheetsPush(rawBody, timestamp, signature, secret, Number(timestamp));
  });

  const parsed = JSON.parse(call.options.payload);
  assert.equal(parsed.spreadsheetId, 'test-workbook-102026');
  assert.equal(parsed.sheet.id, 101);
  assert.equal(parsed.sheet.name, 'October 2026');
  assert.equal(parsed.sheet.rowCount, 50);
  assert.deepEqual(parsed.sheet.merges, ['A2:T2']);
  assert.equal(parsed.sheet.rows.length, 4);
  assert.deepEqual(parsed.sheet.rows[3], ['10/20/2026', 'Syrup', 'ML-SFG-26-0001']);
});

test('trailing empty cells in rows and trailing empty rows are trimmed', () => {
  const env = createGasEnvironment({
    sheets: [
      {
        id: 102,
        name: 'October 2026',
        maxRows: 100,
        maxCols: 10,
        values: [
          ['Header', 'Col2', '', ''],
          ['Data', '', '', ''],
          ['', '', '', ''],
          ['', '', '', '']
        ],
        merges: ['A1:B1']
      }
    ]
  });

  env.exports.pushActiveSheet();
  const parsed = JSON.parse(env.fetchCalls[0].options.payload);
  assert.equal(parsed.sheet.rows.length, 2);
  assert.deepEqual(parsed.sheet.rows[0], ['Header', 'Col2']);
  assert.deepEqual(parsed.sheet.rows[1], ['Data']);
});

test('pushCurrentMonth selects the tab matching current month in spreadsheet timezone', () => {
  const fixedNow = new Date('2026-10-20T04:30:00Z');
  const env = createGasEnvironment({
    timeZone: 'Asia/Manila',
    now: () => fixedNow,
    sheets: [
      { id: 9, name: 'September 2026', values: [['Sep']] },
      { id: 10, name: 'October 2026', values: [['Oct']] },
      { id: 11, name: 'November 2026', values: [['Nov']] }
    ]
  });

  const status = env.exports.pushCurrentMonth();
  assert.equal(status.sheetName, 'October 2026');
  assert.equal(status.sheetId, 10);
  assert.equal(status.success, true);
  const parsed = JSON.parse(env.fetchCalls[0].options.payload);
  assert.equal(parsed.sheet.name, 'October 2026');
});

test('pushCurrentMonth logs warning and updates status when no matching month tab is present', () => {
  const fixedNow = new Date('2026-10-20T04:30:00Z');
  const env = createGasEnvironment({
    timeZone: 'Asia/Manila',
    now: () => fixedNow,
    sheets: [
      { id: 8, name: 'August 2026', values: [['Aug']] }
    ]
  });

  const status = env.exports.pushCurrentMonth();
  assert.equal(status.success, false);
  assert.equal(status.count, 0);
  assert.equal(env.fetchCalls.length, 0);
  const recorded = JSON.parse(env.properties.IPI_LAST_STATUS);
  assert.match(recorded.errors[0], /No monthly logbook tab found for 2026-10/);
});

test('installTrigger saves bound spreadsheet ID and prevents duplicates of only its handler', () => {
  const env = createGasEnvironment({
    spreadsheetId: 'bound-sheet-abc'
  });

  // Seed unrelated trigger
  env.triggers.push({ id: 'trig_user', handler: 'onEditTrigger' });

  // First install
  env.exports.installTrigger();
  assert.equal(env.properties.IPI_SPREADSHEET_ID, 'bound-sheet-abc');
  assert.equal(env.triggers.length, 2);
  assert.ok(env.triggers.some(t => t.handler === 'onEditTrigger'));
  assert.equal(env.triggers.filter(t => t.handler === 'pushCurrentMonth').length, 1);

  // Second install (idempotency check)
  env.exports.installTrigger();
  assert.equal(env.triggers.length, 2);
  assert.ok(env.triggers.some(t => t.handler === 'onEditTrigger'));
  assert.equal(env.triggers.filter(t => t.handler === 'pushCurrentMonth').length, 1);

  // Uninstall removes only pushCurrentMonth
  env.exports.uninstallTrigger();
  assert.equal(env.triggers.length, 1);
  assert.equal(env.triggers[0].handler, 'onEditTrigger');
});

test('transient failures (502, 503, network exception) retry up to 3 times with the exact same signed payload', () => {
  let attemptCounter = 0;
  const env = createGasEnvironment({
    fetchHandler: (url, options, attempt) => {
      attemptCounter++;
      if (attempt === 1) {
        return { getResponseCode: () => 503, getContentText: () => 'Service Unavailable' };
      }
      if (attempt === 2) {
        throw new Error('Socket timeout');
      }
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ count: 15, errors: [] }) };
    }
  });

  const status = env.exports.pushActiveSheet();
  assert.equal(status.success, true);
  assert.equal(status.count, 15);
  assert.equal(attemptCounter, 3);
  assert.equal(env.fetchCalls.length, 3);

  // Verify every retry attempt reuses the EXACT same signed payload (same timestamp, same signature, same payload)
  const firstCall = env.fetchCalls[0];
  for (let i = 1; i < env.fetchCalls.length; i++) {
    assert.equal(env.fetchCalls[i].options.payload, firstCall.options.payload);
    assert.equal(env.fetchCalls[i].options.headers['X-IPI-Timestamp'], firstCall.options.headers['X-IPI-Timestamp']);
    assert.equal(env.fetchCalls[i].options.headers['X-IPI-Signature'], firstCall.options.headers['X-IPI-Signature']);
  }
});

test('partial failure (HTTP 207) is recorded without transient retries', () => {
  let attemptCount = 0;
  const env = createGasEnvironment({
    fetchHandler: () => {
      attemptCount++;
      return {
        getResponseCode: () => 207,
        getContentText: () => JSON.stringify({
          count: 14,
          errors: ['1 source record(s) require reconciliation. ML-WS-26-1560 row 86 identity conflict']
        })
      };
    }
  });

  const status = env.exports.pushActiveSheet();
  assert.equal(status.statusCode, 207);
  assert.equal(status.count, 14);
  assert.equal(status.errors.length, 1);
  assert.equal(status.success, false);
  // 207 is completed partial sync; MUST NOT retry
  assert.equal(attemptCount, 1);

  const recorded = JSON.parse(env.properties.IPI_LAST_STATUS);
  assert.equal(recorded.statusCode, 207);
  assert.equal(recorded.count, 14);
  assert.deepEqual(recorded.errors, ['1 source record(s) require reconciliation. ML-WS-26-1560 row 86 identity conflict']);
});

test('security validation rejects secrets < 32 characters and unsafe URLs without exposing secrets', () => {
  // Short secret
  const envShort = createGasEnvironment({ secret: 'short-secret-less-32-chars' });
  assert.throws(() => {
    envShort.exports.pushActiveSheet();
  }, /IPI_SYNC_SECRET must be configured and at least 32 characters/);

  // Insecure HTTP URL
  const envHttp = createGasEnvironment({ url: 'http://ipi-qc.onrender.com/api/integrations/sheets/push' });
  assert.throws(() => {
    envHttp.exports.pushActiveSheet();
  }, /Invalid IPI_SYNC_URL: must be HTTPS/);

  // Incorrect endpoint route
  const envRoute = createGasEnvironment({ url: 'https://ipi-qc.onrender.com/api/other/endpoint' });
  assert.throws(() => {
    envRoute.exports.pushActiveSheet();
  }, /Invalid IPI_SYNC_URL: must be HTTPS/);

  // Ensure secret is never exposed in status property
  assert.equal(envShort.properties.IPI_LAST_STATUS, undefined);
});

test('script lock contention skips execution safely', () => {
  const env = createGasEnvironment({
    lockAcquired: false
  });

  const result = env.exports.pushActiveSheet();
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'lock_busy');
  assert.equal(env.fetchCalls.length, 0);
});

test('rejects sheet exceeding 5,000 rows or unapproved tab names', () => {
  const envOver5000 = createGasEnvironment({
    sheets: [{ id: 1, name: 'October 2026', maxRows: 5001 }]
  });
  assert.throws(() => {
    envOver5000.exports.pushActiveSheet();
  }, /Monthly sheet exceeds the reviewed 5,000-row limit/);

  const envInvalidName = createGasEnvironment({
    sheets: [{ id: 2, name: 'Summary Analysis', maxRows: 100 }]
  });
  assert.throws(() => {
    envInvalidName.exports.pushActiveSheet();
  }, /is not a recognized monthly logbook tab/);
});

test('captures snapshot timestamp before reading values and merges from sheet', () => {
  const eventTrace: string[] = [];
  const env = createGasEnvironment({
    eventTrace,
    sheets: [
      {
        id: 106,
        name: 'October 2026',
        values: [['10/20/2026', 'Syrup', 'ML-SFG-26-0001']],
        merges: ['A1:C1']
      }
    ]
  });

  env.exports.pushActiveSheet();
  const firstNowIdx = eventTrace.indexOf('Date.now');
  const firstGetDisplayValuesIdx = eventTrace.indexOf('getDisplayValues');
  const firstGetMergedRangesIdx = eventTrace.indexOf('getMergedRanges');
  assert.ok(firstNowIdx >= 0, 'Date.now must be called');
  assert.ok(firstGetDisplayValuesIdx >= 0, 'getDisplayValues must be called');
  assert.ok(firstGetMergedRangesIdx >= 0, 'getMergedRanges must be called');
  assert.ok(firstNowIdx < firstGetDisplayValuesIdx, 'Date.now must precede getDisplayValues');
  assert.ok(firstNowIdx < firstGetMergedRangesIdx, 'Date.now must precede getMergedRanges');
});

test('rejects cell value exceeding 10,000 characters before network', () => {
  const env = createGasEnvironment({
    sheets: [
      {
        id: 107,
        name: 'October 2026',
        values: [['valid', 'x'.repeat(10001)]]
      }
    ]
  });

  assert.throws(() => {
    env.exports.pushActiveSheet();
  }, /Cell value exceeds 10,000 characters at row 1, column 2/);
  assert.equal(env.fetchCalls.length, 0);
});

test('rejects populated columns exceeding 153 (A:EW) before network', () => {
  const longRow = new Array(154).fill('val');
  const env = createGasEnvironment({
    sheets: [
      {
        id: 108,
        name: 'October 2026',
        values: [longRow]
      }
    ]
  });

  assert.throws(() => {
    env.exports.pushActiveSheet();
  }, /Populated columns exceed the 153-column limit \(columns A:EW\): 154/);
  assert.equal(env.fetchCalls.length, 0);
});

test('rejects merges exceeding 1,000 before network', () => {
  const merges = Array.from({ length: 1001 }, (_, i) => `A${i + 1}:B${i + 1}`);
  const env = createGasEnvironment({
    sheets: [
      {
        id: 109,
        name: 'October 2026',
        values: [['data']],
        merges
      }
    ]
  });

  assert.throws(() => {
    env.exports.pushActiveSheet();
  }, /Merged cell ranges exceed the 1,000 limit: 1001/);
  assert.equal(env.fetchCalls.length, 0);
});

test('preserves merges across reviewed range including empty reserved rows', () => {
  const env = createGasEnvironment({
    sheets: [
      {
        id: 110,
        name: 'October 2026',
        maxRows: 100,
        maxCols: 20,
        values: [
          ['Header'],
          ['Row 2 data']
        ],
        // Merges present in both populated rows and empty reserved rows
        merges: ['A1:T1', 'A50:T50']
      }
    ]
  });

  env.exports.pushActiveSheet();
  const parsed = JSON.parse(env.fetchCalls[0].options.payload);
  assert.deepEqual(parsed.sheet.merges, ['A1:T1', 'A50:T50']);
});

test('currentMonthYear fails on invalid timezone without fallback to machine timezone', () => {
  const env = createGasEnvironment();
  assert.throws(() => {
    env.exports.currentMonthYear(new Date(), 'Invalid/Timezone_Not_Real');
  });
});

test('non-2xx responses throw an error after recording status so execution is marked failed', () => {
  const env = createGasEnvironment({
    fetchHandler: () => ({
      getResponseCode: () => 500,
      getContentText: () => JSON.stringify({ error: 'Internal Server Error' })
    })
  });

  assert.throws(() => {
    env.exports.pushActiveSheet();
  }, /IPI push failed \(HTTP 500\): Internal Server Error/);

  const recorded = JSON.parse(env.properties.IPI_LAST_STATUS);
  assert.equal(recorded.statusCode, 500);
  assert.equal(recorded.success, false);
  assert.deepEqual(recorded.errors, ['Internal Server Error']);
});
