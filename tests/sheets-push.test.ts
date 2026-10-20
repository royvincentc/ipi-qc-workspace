import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { Fault } from '../server/domain.js';
import { registerSheetsPush, type SheetsPush } from '../server/sheets-push.js';

const secret = '0123456789abcdef0123456789abcdef';

const samplePayload: SheetsPush = {
  spreadsheetId: '1MuV-oZd_6EO89usUdeqhgozrzsR15zDIFWxT8rRLjxs',
  sheet: {
    id: 1,
    name: 'January 2026',
    rowCount: 10,
    rows: [['2026-01-05', 'Sample A', 'ML-001']],
    merges: ['A2:T2']
  }
};

function sign(raw: Buffer, key: string, timestamp: string) {
  return createHmac('sha256', key).update(timestamp + '.').update(raw).digest('hex');
}

async function withServer(
  dependencies: {
    secret?: () => string | undefined;
    accept?: (payload: SheetsPush, timestamp: string, digest: string) => Promise<{ count: number; errors: string[] }>;
  },
  run: (url: string) => Promise<void>
) {
  const app = express();
  registerSheetsPush(app, dependencies);
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err instanceof Fault ? err.status : err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({
      error: status === 500
        ? 'The server could not complete this operation.'
        : err instanceof z.ZodError
        ? err.issues.map((i: any) => i.message).join('; ')
        : err.message
    });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  const { port } = server.address() as { port: number };
  try {
    await run(`http://127.0.0.1:${port}/api/integrations/sheets/push`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  }
}

test('valid signed JSON accepted and exact digest passed to handler', async () => {
  let invoked = 0;
  let capturedPayload: SheetsPush | undefined;
  let capturedTimestamp = '';
  let capturedDigest = '';

  await withServer(
    {
      secret: () => secret,
      accept: async (payload, timestamp, digest) => {
        invoked++;
        capturedPayload = payload;
        capturedTimestamp = timestamp;
        capturedDigest = digest;
        return { count: 1, errors: [] };
      }
    },
    async (url) => {
      const raw = Buffer.from(JSON.stringify(samplePayload), 'utf8');
      const timestamp = Date.now().toString();
      const signature = sign(raw, secret, timestamp);
      const expectedDigest = createHash('sha256').update(raw).digest('hex');

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': timestamp,
          'X-IPI-Signature': signature
        },
        body: raw
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('cache-control'), 'no-store');
      const body = await res.json();
      assert.deepEqual(body, { count: 1, errors: [] });
      assert.equal(invoked, 1);
      assert.deepEqual(capturedPayload, samplePayload);
      assert.equal(capturedTimestamp, timestamp);
      assert.equal(capturedDigest, expectedDigest);
    }
  );
});

test('missing, invalid, or tampered signature/timestamp rejects with 401 without invoking handler', async () => {
  let invoked = 0;
  await withServer(
    {
      secret: () => secret,
      accept: async () => {
        invoked++;
        return { count: 1, errors: [] };
      }
    },
    async (url) => {
      const raw = Buffer.from(JSON.stringify(samplePayload), 'utf8');
      const timestamp = Date.now().toString();
      const validSig = sign(raw, secret, timestamp);
      const tamperedSig = validSig.slice(0, -1) + (validSig.endsWith('0') ? '1' : '0');

      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-IPI-Timestamp': timestamp },
        body: raw
      });
      assert.equal(res.status, 401);

      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-IPI-Signature': validSig },
        body: raw
      });
      assert.equal(res.status, 401);

      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': timestamp,
          'X-IPI-Signature': tamperedSig
        },
        body: raw
      });
      assert.equal(res.status, 401);

      const tamperedRaw = Buffer.from(JSON.stringify({ ...samplePayload, spreadsheetId: 'tampered-id-12345' }));
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': timestamp,
          'X-IPI-Signature': validSig
        },
        body: tamperedRaw
      });
      assert.equal(res.status, 401);

      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': timestamp,
          'X-IPI-Signature': 'not-a-valid-hex-signature'
        },
        body: raw
      });
      assert.equal(res.status, 401);

      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': '12345',
          'X-IPI-Signature': validSig
        },
        body: raw
      });
      assert.equal(res.status, 401);

      assert.equal(invoked, 0);
    }
  );
});

test('expired or future timestamps reject with 401 without invoking handler', async () => {
  let invoked = 0;
  await withServer(
    {
      secret: () => secret,
      accept: async () => {
        invoked++;
        return { count: 1, errors: [] };
      }
    },
    async (url) => {
      const raw = Buffer.from(JSON.stringify(samplePayload), 'utf8');

      const expiredTs = (Date.now() - 6 * 60 * 1000).toString();
      const expiredSig = sign(raw, secret, expiredTs);
      let res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': expiredTs,
          'X-IPI-Signature': expiredSig
        },
        body: raw
      });
      assert.equal(res.status, 401);

      const futureTs = (Date.now() + 6 * 60 * 1000).toString();
      const futureSig = sign(raw, secret, futureTs);
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': futureTs,
          'X-IPI-Signature': futureSig
        },
        body: raw
      });
      assert.equal(res.status, 401);

      assert.equal(invoked, 0);
    }
  );
});

test('unconfigured or short secret rejects with 503 without invoking handler', async () => {
  let invoked = 0;
  const raw = Buffer.from(JSON.stringify(samplePayload), 'utf8');
  const timestamp = Date.now().toString();

  await withServer(
    {
      secret: () => undefined,
      accept: async () => {
        invoked++;
        return { count: 1, errors: [] };
      }
    },
    async (url) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': timestamp,
          'X-IPI-Signature': '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        },
        body: raw
      });
      assert.equal(res.status, 503);
    }
  );

  const shortSecret = 'short-key-under-32-bytes';
  await withServer(
    {
      secret: () => shortSecret,
      accept: async () => {
        invoked++;
        return { count: 1, errors: [] };
      }
    },
    async (url) => {
      const sig = sign(raw, shortSecret, timestamp);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': timestamp,
          'X-IPI-Signature': sig
        },
        body: raw
      });
      assert.equal(res.status, 503);
    }
  );

  assert.equal(invoked, 0);
});

test('payload validation rejects invalid structure, non-monthly names, oversized rows, and bad JSON', async () => {
  let invoked = 0;
  await withServer(
    {
      secret: () => secret,
      accept: async () => {
        invoked++;
        return { count: 1, errors: [] };
      }
    },
    async (url) => {
      const sendPayload = async (payload: unknown) => {
        const raw = Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload), 'utf8');
        const timestamp = Date.now().toString();
        const signature = sign(raw, secret, timestamp);
        return fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-IPI-Timestamp': timestamp,
            'X-IPI-Signature': signature
          },
          body: raw
        });
      };

      let res = await sendPayload({
        ...samplePayload,
        sheet: { ...samplePayload.sheet, name: 'Summary Analysis' }
      });
      assert.equal(res.status, 400);

      res = await sendPayload({
        ...samplePayload,
        spreadsheetId: 'short'
      });
      assert.equal(res.status, 400);

      res = await sendPayload({
        ...samplePayload,
        sheet: {
          ...samplePayload.sheet,
          rowCount: 1,
          rows: [['Row 1'], ['Row 2']]
        }
      });
      assert.equal(res.status, 400);

      res = await sendPayload({
        ...samplePayload,
        sheet: {
          ...samplePayload.sheet,
          rowCount: 10,
          rows: [new Array(154).fill('val')]
        }
      });
      assert.equal(res.status, 400);

      res = await sendPayload('{"spreadsheetId": "invalid-json');
      assert.equal(res.status, 400);

      res = await sendPayload({
        ...samplePayload,
        unexpectedProperty: true
      });
      assert.equal(res.status, 400);

      assert.equal(invoked, 0);
    }
  );
});

test('rejects request without application/json content type with 415', async () => {
  let invoked = 0;
  await withServer(
    {
      secret: () => secret,
      accept: async () => {
        invoked++;
        return { count: 1, errors: [] };
      }
    },
    async (url) => {
      const raw = Buffer.from(JSON.stringify(samplePayload), 'utf8');
      const timestamp = Date.now().toString();
      const signature = sign(raw, secret, timestamp);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'X-IPI-Timestamp': timestamp,
          'X-IPI-Signature': signature
        },
        body: raw
      });

      assert.equal(res.status, 415);
      assert.equal(invoked, 0);
    }
  );
});

test('returns 207 Multi-Status when accept handler reports partial errors', async () => {
  await withServer(
    {
      secret: () => secret,
      accept: async () => ({
        count: 5,
        errors: ['WS / Water: row 12 malformed value']
      })
    },
    async (url) => {
      const raw = Buffer.from(JSON.stringify(samplePayload), 'utf8');
      const timestamp = Date.now().toString();
      const signature = sign(raw, secret, timestamp);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': timestamp,
          'X-IPI-Signature': signature
        },
        body: raw
      });

      assert.equal(res.status, 207);
      const body = await res.json();
      assert.deepEqual(body, {
        count: 5,
        errors: ['WS / Water: row 12 malformed value']
      });
    }
  );
});

test('downstream Fault in accept handler is formatted by error middleware', async () => {
  await withServer(
    {
      secret: () => secret,
      accept: async () => {
        throw new Fault(409, 'An equal or newer snapshot was already accepted. Run a fresh push.');
      }
    },
    async (url) => {
      const raw = Buffer.from(JSON.stringify(samplePayload), 'utf8');
      const timestamp = Date.now().toString();
      const signature = sign(raw, secret, timestamp);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPI-Timestamp': timestamp,
          'X-IPI-Signature': signature
        },
        body: raw
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.error, 'An equal or newer snapshot was already accepted. Run a fresh push.');
    }
  );
});
