import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import type {Express} from 'express';
import {registerReception} from '../server/reception.js';
import {
  calculateReceptionWindow,
  formatReceptionCategory,
  parseReceivedDate,
  resolveReceptionCategory,
  type ReceptionOverview,
} from '../shared/reception.js';

test('calculateReceptionWindow computes 31-day windows for current and prior months', () => {
  // Current month: rolling 31 days ending today
  const current = calculateReceptionWindow('2026-10', '2026-10-16');
  assert.equal(current.month, '2026-10');
  assert.equal(current.endDate, '2026-10-16');
  assert.equal(current.startDate, '2026-09-16');
  assert.equal(current.dateList.length, 31);
  assert.equal(current.dateList[0], '2026-09-16');
  assert.equal(current.dateList[30], '2026-10-16');
  assert.equal(current.monthStart, '2026-10-01');
  assert.equal(current.monthEnd, '2026-10-31');

  // Prior month: 31 days ending on last day of selected month
  const priorSept = calculateReceptionWindow('2026-09', '2026-10-16');
  assert.equal(priorSept.month, '2026-09');
  assert.equal(priorSept.endDate, '2026-09-30');
  assert.equal(priorSept.startDate, '2026-08-31');
  assert.equal(priorSept.dateList.length, 31);
  assert.equal(priorSept.dateList[30], '2026-09-30');

  // Prior month non-leap February (28 days + 3 days of January)
  const priorFeb = calculateReceptionWindow('2026-02', '2026-10-16');
  assert.equal(priorFeb.month, '2026-02');
  assert.equal(priorFeb.endDate, '2026-02-28');
  assert.equal(priorFeb.startDate, '2026-01-29');
  assert.equal(priorFeb.dateList.length, 31);

  // Clamps future month to current month
  const future = calculateReceptionWindow('2026-12', '2026-10-16');
  assert.equal(future.month, '2026-10');
  assert.equal(future.endDate, '2026-10-16');
});

test('category display formatting and query alias resolution', () => {
  assert.equal(formatReceptionCategory('ST'), 'STAB');
  assert.equal(formatReceptionCategory('MIS'), 'MISC');
  assert.equal(formatReceptionCategory('WS'), 'WATER');
  assert.equal(formatReceptionCategory('SFG'), 'SFG');
  assert.equal(formatReceptionCategory('FG'), 'FG');
  assert.equal(formatReceptionCategory('RM'), 'RM');
  assert.equal(formatReceptionCategory('EM'), 'EM');

  assert.equal(resolveReceptionCategory('STAB'), 'ST');
  assert.equal(resolveReceptionCategory('stab'), 'ST');
  assert.equal(resolveReceptionCategory('MISC'), 'MIS');
  assert.equal(resolveReceptionCategory('WATER'), 'WS');
  assert.equal(resolveReceptionCategory('SFG'), 'SFG');
  assert.equal(resolveReceptionCategory(' fg '), 'FG');
  assert.equal(resolveReceptionCategory('water'), 'WS');
  assert.equal(resolveReceptionCategory('CUSTOM_CAT'), 'CUSTOM_CAT');
});

test('parseReceivedDate rejects invalid dates, times, and offsets', () => {
  for (const value of [
    null, undefined, 20261016, {}, '', 'Not recorded',
    '2026-02-29', '2026-04-31', '2026-00-16', '2026-13-01',
    '02/29/2026', '04/31/2026', '00/16/2026', '10/00/2026',
    '2026-10-16T24:00', '2026-10-16 09:60', '2026-10-16T09:00:60Z',
    '2026-10-16T09:00+99:99', '2026-10-16 09:00+24:00',
    '2026-10-16T09:00+08:60', '2026-10-16T09:00.5',
    '10/16/2026 @ 00:30 AM', '10/16/2026 @ 13:00 PM',
    '10/16/2026 @ 25:00', '10/16/2026 @ 12:60 PM',
    '10/20/2026 @ 08: 60 AM', '10/20/2026 @ 13 : 46 AM',
    '10/20/2026 @ 08: 4 6 AM',
    '2026-10-16 junk',
  ]) {
    assert.equal(parseReceivedDate(value), null, String(value));
  }
});

test('parseReceivedDate uses stable timestamps for ISO and US receipt formats', () => {
  const cases: [string, string, string][] = [
    ['2026-10-16', '2026-10-16', '2026-10-16T00:00:00Z'],
    [' 10/16/2026 ', '2026-10-16', '2026-10-16T00:00:00Z'],
    ['2024-02-29', '2024-02-29', '2024-02-29T00:00:00Z'],
    ['2026-10-16T09:30', '2026-10-16', '2026-10-16T09:30:00Z'],
    ['2026-10-16 9:30', '2026-10-16', '2026-10-16T09:30:00Z'],
    ['2026-10-16T09:30:15.125Z', '2026-10-16', '2026-10-16T09:30:15.125Z'],
    ['2026-10-16 09:30:15.125+08:00', '2026-10-16', '2026-10-16T01:30:15.125Z'],
    ['2026-10-16T09:30+0800', '2026-10-16', '2026-10-16T01:30:00Z'],
    ['2026-10-16T00:30-02:00', '2026-10-16', '2026-10-16T02:30:00Z'],
    ['2026-10-16T00:30+08:00', '2026-10-16', '2026-10-15T16:30:00Z'],
    ['10/16/2026 @ 9:30 AM', '2026-10-16', '2026-10-16T09:30:00Z'],
    ['10/16/2026 @ 12:00 AM', '2026-10-16', '2026-10-16T00:00:00Z'],
    ['10/16/2026 @ 12:00 PM', '2026-10-16', '2026-10-16T12:00:00Z'],
    ['10/16/2026 @ 1:30 pm', '2026-10-16', '2026-10-16T13:30:00Z'],
    ['10/16/2026 @ 23:59', '2026-10-16', '2026-10-16T23:59:00Z'],
    ['10/20/2026 @ 08: 46 AM', '2026-10-20', '2026-10-20T08:46:00Z'],
    ['10/20/2026 @ 08 : 46 AM', '2026-10-20', '2026-10-20T08:46:00Z'],
  ];
  for (const [raw, date, timestamp] of cases) {
    assert.deepEqual(parseReceivedDate(raw), {date, timestamp: Date.parse(timestamp)}, raw);
  }
});

test('20 October receipts include all nine WATER rows with a spaced time separator', async () => {
  const rows = Object.entries({SFG: 1, FG: 4, RM: 1, WS: 9}).flatMap(([category, count]) =>
    Array.from({length: count}, (_, i) => ({
      id: `${category}-${i}`, ml: `ML-${category}-26-${i + 1}`, category,
      name: 'Receipt', batch: '', status: 'ON-GOING',
      received: category === 'WS' ? '10/20/2026 @ 08: 46 AM' : '10/20/2026 @08:46 AM',
    })),
  );
  let handler: any, overview!: ReceptionOverview;
  registerReception({get: (_path: string, route: any) => {handler = route;}} as unknown as Express, {
    query: async <T>() => ({rows: rows as unknown as T[]}),
  }, {timezone: 'Asia/Manila', now: () => new Date('2026-10-20T07:00:00Z')});
  await handler({query: {month: '2026-10', date: '2026-10-20'}}, {
    json: (data: ReceptionOverview) => {overview = data;},
  });
  assert.deepEqual(overview.days.find(day => day.date === '2026-10-20'), {
    date: '2026-10-20', total: 15, counts: {SFG: 1, FG: 4, RM: 1, WS: 9},
  });
  assert.equal(overview.total, 15);
  assert.equal(overview.tableTotal, 15);
  assert.equal(overview.undated, 0);
  assert.equal(overview.items.filter(item => item.category === 'WS').length, 9);
});

test('GET /api/reception aggregates receipts and filters grouped pages', async (t) => {
  const pg = new PGlite();
  try {
    await pg.exec(`
      CREATE TABLE samples(id text PRIMARY KEY, data jsonb, updated_at timestamptz);
    `);

    const sampleRecords = [
      // October samples (current month)
      { id: 's1', category: 'SFG', ml: 'ML-SFG-26-0001', name: 'Product SFG', batch: 'B1', received: '2026-10-16 08:30', status: 'ON-GOING', fields: { area: 'Area 1' } },
      { id: 's2', category: ' fg ', ml: 'ML-FG-26-0001', name: 'Product FG', batch: 'B2', received: '2026-10-16 10:15', status: 'RELEASED', fields: { facility: 'PF1' } },
      { id: 's3', category: 'stab', ml: 'ML-ST-26-0001', name: 'Product ST', batch: 'B3', received: '2026-10-05', status: 'RELEASED', fields: {} },
      { id: 's4', category: 'misc', ml: 'ML-MIS-26-0001', name: 'Miscellaneous Item', batch: 'B4', received: '10/05/2026', status: '', fields: {} },
      { id: 's5', category: 'water', ml: 'ML-WS-26-0001', name: 'Purified Water', batch: 'W1', received: '2026-10-01 14:00', status: 'ON-GOING', fields: {} },
      { id: 's6', category: 'rm', ml: 'ML-RM-26-0001', name: 'Raw Material A', batch: 'R1', received: '2026-10-01', status: 'RELEASED', fields: {} },
      { id: 's7', category: 'em', ml: 'ML-EM-26-0001', name: 'Air Sampling', batch: 'E1', received: '2026-10-01', status: 'ON-GOING', fields: {} },

      // September context samples (within 31-day window of Oct 16: Sept 16..30)
      { id: 's-sept-context', category: 'ST', ml: 'ML-ST-26-0099', name: 'Prior Month Context', batch: 'B-OLD', received: '2026-09-25 09:00', status: 'RELEASED', fields: { area: 'Compounding' } },

      // September sample outside 31-day window of Oct 16 (Sept 10 is < Sept 16)
      { id: 's-sept-outside', category: 'FG', ml: 'ML-FG-26-0080', name: 'Early Sept', batch: 'B-EARLY', received: '2026-09-10', status: 'RELEASED', fields: {} },

      // Invalid or undated samples
      { id: 's-undated-1', category: 'FG', ml: 'ML-FG-26-0000', name: 'Undated Missing', batch: 'B0', received: '', status: '', fields: {} },
      { id: 's-undated-2', category: 'ST', ml: 'ML-ST-26-0000', name: 'Undated Invalid', batch: 'B00', received: 'Not recorded', status: 'ON-GOING', fields: {} },
      { id: 's-invalid-date', category: 'SFG', received: '2026-02-30' },
      { id: 's-invalid-time', category: 'SFG', received: '2026-10-16T25:00' },
      { id: 's-invalid-offset', category: 'SFG', received: '2026-10-16T09:00+99:99' },
      { id: 's-invalid-type', category: 'SFG', received: {unexpected: true} },
      { id: 's-future-day', category: 'SFG', received: '2026-10-17' },
      { id: 's-future-month', category: 'FG', received: '2026-11-01' },
    ];

    for (const s of sampleRecords) {
      await pg.query('INSERT INTO samples VALUES($1,$2,$3)', [s.id, JSON.stringify(s), '2026-10-01T00:00:00Z']);
    }

    const handlers = new Map<string, any>();
    let now = new Date('2026-10-16T15:59:59Z');
    registerReception({ get: (path: string, handler: any) => handlers.set(path, handler) } as unknown as Express, {
      query: async (sql: string, args?: any[]) => pg.query(sql, args),
    }, {
      timezone: 'Asia/Taipei',
      now: () => now,
    });

    const request = async (query: Record<string, string> = {}, expectedStatus = 200): Promise<ReceptionOverview> => {
      let body: any;
      let status = 200;
      const response = {
        status: (value: number) => { status = value; return response; },
        json: (value: any) => { body = value; return response; },
      };
      await handlers.get('/api/reception')({ query }, response);
      assert.equal(status, expectedStatus, JSON.stringify(query));
      return body;
    };

    // 1. Current month overview
    const currentOverview = await request({ month: '2026-10' });
    assert.equal(currentOverview.month, '2026-10');
    assert.equal(currentOverview.today, '2026-10-16');
    assert.equal(currentOverview.startDate, '2026-09-16');
    assert.equal(currentOverview.endDate, '2026-10-16');
    assert.equal(currentOverview.days.length, 31);
    assert.equal(currentOverview.undated, 6);
    assert.equal(currentOverview.days.reduce((sum, day) => sum + day.total, 0), 8);

    // totals only count October samples (s1..s7 = 7 total)
    // s-sept-context is Sept 25, so it is in `days` but NOT in October totals
    assert.equal(currentOverview.total, 7);
    assert.equal(currentOverview.totals.SFG, 1);
    assert.equal(currentOverview.totals.FG, 1);
    assert.equal(currentOverview.totals.ST, 1);
    assert.equal(currentOverview.totals.MIS, 1);
    assert.equal(currentOverview.totals.WS, 1);
    assert.equal(currentOverview.totals.RM, 1);
    assert.equal(currentOverview.totals.EM, 1);

    // Sept 25 day in `days` has count 1 (ST), while October totals do not count it
    const sept25Day = currentOverview.days.find(d => d.date === '2026-09-25');
    assert.ok(sept25Day, 'September 25 should be in 31-day window of October 16');
    assert.equal(sept25Day.total, 1);
    assert.equal(sept25Day.counts.ST, 1);

    // Sept 10 is outside the 31-day window
    const sept10Day = currentOverview.days.find(d => d.date === '2026-09-10');
    assert.equal(sept10Day, undefined);

    // Available statuses: includes 'Not recorded' because s4 and s-undated-1 have empty status
    assert.ok(currentOverview.statuses.includes('Not recorded'));
    assert.ok(currentOverview.statuses.includes('ON-GOING'));
    assert.ok(currentOverview.statuses.includes('RELEASED'));

    // Table items for October by default (7 items)
    assert.equal(currentOverview.tableTotal, 7);
    assert.equal(currentOverview.items.length, 7);

    // SFG precedes FG even when the FG receipt is newer.
    assert.deepEqual(currentOverview.items.map(item => item.id), ['s1', 's2', 's3', 's4', 's5', 's6', 's7']);
    assert.deepEqual(currentOverview.items.map(item => item.category), ['SFG', 'FG', 'ST', 'MIS', 'WS', 'RM', 'EM']);
    assert.equal(currentOverview.items[1].status, 'RELEASED');
    assert.equal(currentOverview.items[0].receiptDate, '2026-10-16');
    assert.equal(currentOverview.items[3].status, 'Not recorded'); // s4 had empty status

    // 2. Select prior month context day: shows that day in table while month totals remain unchanged
    const contextDayOverview = await request({ month: '2026-10', date: '2026-09-25' });
    assert.equal(contextDayOverview.total, 7); // month total unchanged
    assert.equal(contextDayOverview.tableTotal, 1);
    assert.equal(contextDayOverview.items.length, 1);
    assert.equal(contextDayOverview.items[0].id, 's-sept-context');

    // 3. Category alias filter: ?category=STAB matches 'ST'
    const stabFilter = await request({ month: '2026-10', category: 'STAB' });
    assert.equal(stabFilter.tableTotal, 1);
    assert.equal(stabFilter.items[0].id, 's3');
    assert.equal(stabFilter.items[0].category, 'ST');

    // 4. Status filter: 'Not recorded'
    const notRecordedFilter = await request({ month: '2026-10', status: 'Not recorded' });
    assert.equal(notRecordedFilter.tableTotal, 1);
    assert.equal(notRecordedFilter.items[0].id, 's4');

    // 5. Query filter: location / area
    const queryFilter = await request({ month: '2026-10', q: 'Area 1' });
    assert.equal(queryFilter.tableTotal, 1);
    assert.equal(queryFilter.items[0].id, 's1');

    // 6. Query prior month: September 2026
    const septOverview = await request({ month: '2026-09' });
    assert.equal(septOverview.month, '2026-09');
    assert.equal(septOverview.endDate, '2026-09-30');
    assert.equal(septOverview.startDate, '2026-08-31');
    assert.equal(septOverview.total, 2); // s-sept-context + s-sept-outside
    assert.equal(septOverview.tableTotal, 2);

    // 7. Pagination clamping: page out of bounds is clamped to 1
    const clampedPage = await request({ month: '2026-10', page: '999' });
    assert.equal(clampedPage.page, 1);
    assert.equal(clampedPage.pageSize, 30);

    await t.test('uses Taipei calendar midnight for the injected clock', async () => {
      const originalNow = now;
      try {
        now = new Date('2026-10-15T16:00:00Z');
        assert.deepEqual(await request(), currentOverview);
        now = new Date('2026-10-15T15:59:59Z');
        const previousDay = await request();
        assert.equal(previousDay.today, '2026-10-15');
        assert.equal(previousDay.endDate, '2026-10-15');
        assert.equal(previousDay.total, 5);
        assert.deepEqual(previousDay.items.map(item => item.id), ['s3', 's4', 's5', 's6', 's7']);
      } finally {
        now = originalNow;
      }
    });

    await t.test('default month, context dates, and combined filters retain month aggregates', async () => {
      const defaultOverview = await request();
      assert.deepEqual(defaultOverview, currentOverview);
      for (const category of ['fg', 'FG']) {
        const filtered = await request({category});
        assert.deepEqual(filtered.items.map(item => item.id), ['s2']);
      }
      for (const [category, id] of [['misc', 's4'], ['water', 's5']]) {
        const filtered = await request({category});
        assert.deepEqual(filtered.items.map(item => item.id), [id]);
      }
      const context = await request({month: '2026-10', date: '2026-09-25', category: 'stab', status: 'RELEASED', q: 'COMPOUNDING'});
      assert.deepEqual(context.items.map(item => item.id), ['s-sept-context']);
      assert.deepEqual(context.days, currentOverview.days);
      assert.deepEqual(context.totals, currentOverview.totals);
      const empty = await request({date: '2026-09-25', category: 'FG', page: '999'});
      assert.equal(empty.tableTotal, 0);
      assert.deepEqual(empty.items, []);
      assert.equal(empty.page, 1);
      const today = await request({date: '2026-10-16'});
      assert.deepEqual(today.items.map(item => item.id), ['s1', 's2']);
      assert.equal(today.total, 7);
    });

    await t.test('invalid calendar filters and future dates/months return 400', async () => {
      for (const month of ['2026-00', '2026-13', '2026-1', '2026-11', 'junk']) {
        await request({month}, 400);
      }
      for (const date of ['2026-02-29', '2026-04-31', '2026-10-00', '2026-10-17', '2026-10-16T09:00', '10/16/2026', 'junk']) {
        await request({date}, 400);
      }
    });

    await t.test('normalizes extra/null categories and keeps newest receipts within groups across pages', async () => {
      const moreRecords = [
        ...Array.from({length: 31}, (_, minute) => ({
          id: `sfg-${String(minute).padStart(2, '0')}`,
          category: 'sfg',
          received: minute % 2
            ? `2026-10-02 08:${String(minute).padStart(2, '0')}+08:00`
            : `2026-10-02T00:${String(minute).padStart(2, '0')}`,
        })),
        {id: 'tie-a', category: 'SFG', ml: 'ML-TIE', received: '2026-10-03'},
        {id: 'tie-b', category: 'SFG', ml: 'ML-TIE', received: '2026-10-03'},
        {id: 'tie-ml', category: 'SFG', ml: 'ML-Z', received: '2026-10-03'},
        {id: 'extra-z', category: 'Z_CUSTOM', received: '2026-10-16'},
        {id: 'extra-a-old', category: 'A_CUSTOM', received: '2026-10-01'},
        {id: 'extra-a-new', category: ' a_custom ', received: '2026-10-05'},
        {id: 'null-category', category: null, received: '2026-10-05'},
        {id: 'empty-category', category: ' ', received: '2026-10-04'},
        {id: 'missing-category', received: '2026-10-03'},
      ];
      for (const sample of moreRecords) {
        await pg.query('INSERT INTO samples VALUES($1,$2,$3)', [sample.id, JSON.stringify(sample), '2026-10-01T00:00:00Z']);
      }
      const firstPage = await request({page: '1'});
      const secondPage = await request({page: '2'});
      const ids = [...firstPage.items, ...secondPage.items].map(item => item.id);
      assert.deepEqual(ids, [
        's1', 'tie-ml', 'tie-b', 'tie-a',
        ...Array.from({length: 31}, (_, index) => `sfg-${String(30 - index).padStart(2, '0')}`),
        's2', 's3', 's4', 's5', 's6', 's7',
        'extra-a-new', 'extra-a-old', 'extra-z',
        'null-category', 'empty-category', 'missing-category',
      ]);
      assert.equal(firstPage.items.length, 30);
      assert.equal(secondPage.items.length, 17);
      assert.equal(firstPage.tableTotal, 47);
      assert.equal(secondPage.tableTotal, 47);
      assert.equal(firstPage.total, 47);
      assert.equal(secondPage.total, 47);
      assert.deepEqual(firstPage.totals, {SFG: 35, FG: 1, ST: 1, MIS: 1, WS: 1, RM: 1, EM: 1, A_CUSTOM: 2, Z_CUSTOM: 1, UNKNOWN: 3});
      assert.equal(firstPage.days.find(day => day.date === '2026-10-05')?.counts.UNKNOWN, 1);
      assert.equal(firstPage.days.find(day => day.date === '2026-10-16')?.counts.FG, 1);
      assert.ok(firstPage.items.every(item => !('receiptTimestamp' in item)));
      const unknown = await request({category: 'unknown'});
      assert.deepEqual(unknown.items.map(item => item.id), ['null-category', 'empty-category', 'missing-category']);
      const custom = await request({category: 'a_custom'});
      assert.deepEqual(custom.items.map(item => item.id), ['extra-a-new', 'extra-a-old']);
      assert.equal(custom.totals.A_CUSTOM, 2);
      assert.equal(custom.totals.UNKNOWN, 3);
      for (const page of ['999', 'Infinity']) {
        const clamped = await request({page});
        assert.equal(clamped.page, 2);
        assert.deepEqual(clamped.items, secondPage.items);
      }
      for (const page of ['0', '-1', 'NaN']) {
        const clamped = await request({page});
        assert.equal(clamped.page, 1);
        assert.deepEqual(clamped.items, firstPage.items);
      }
    });
  } finally {
    await pg.close();
  }
});
