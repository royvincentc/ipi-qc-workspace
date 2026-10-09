import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';

test('real collaboration sessions enforce permissions and revoke active streams', { timeout: 30000 }, async () => {
  process.env.DEMO_MODE = 'true';
  process.env.DEMO_DB_PATH = path.resolve('tmp', `shared-session-${randomUUID()}`);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '';
  process.env.GOOGLE_CLIENT_SECRET = '';
  const { db, migrate, close } = await import('../server/db.js');
  const { authenticateSession, sameOrigin } = await import('../server/auth.js');
  const { registerCollaboration } = await import('../server/collaboration.js');
  await migrate();
  const tokens = { a: randomUUID(), b: randomUUID(), viewer: randomUUID(), expired: randomUUID() };
  for (const [name, token] of Object.entries(tokens)) {
    const email = `${name}@example.test`;
    await db.query('INSERT INTO users(email,name,role,active) VALUES($1,$2,$3,true)', [email, name, name === 'viewer' ? 'viewer' : 'analyst']);
    await db.query('INSERT INTO sessions(token_hash,email,expires_at) VALUES($1,$2,$3)', [createHash('sha256').update(token).digest('hex'), email, new Date(Date.now() + (name === 'expired' ? -60000 : 60000)).toISOString()]);
  }
  const app = express();
  app.use(express.json(), cookieParser(), sameOrigin, authenticateSession);
  registerCollaboration(app, authenticateSession);
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.status || 500).json({ error: error.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/collaboration`;
  const controllers: AbortController[] = [];
  const request = (name: keyof typeof tokens, url: string, method = 'GET', body?: unknown, origin = 'http://localhost:5173') => fetch(base + url, {
    method, headers: { Cookie: `ipi_session=${tokens[name]}`, Origin: origin, 'Content-Type': 'application/json', 'x-test-role': 'administrator' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000),
  });
  const stream = async (name: keyof typeof tokens, id: string) => {
    const controller = new AbortController();
    controllers.push(controller);
    const response = await fetch(`${base}/${id}/events`, { headers: { Cookie: `ipi_session=${tokens[name]}` }, signal: controller.signal });
    assert.equal(response.status, 200);
    const reader = response.body!.getReader();
    let buffered = '';
    return async (pattern: RegExp) => {
      const deadline = setTimeout(() => controller.abort(), 5000);
      try {
        while (!pattern.test(buffered)) {
          const next = await reader.read();
          if (next.done) throw new Error(`Stream closed before ${pattern}`);
          buffered += new TextDecoder().decode(next.value);
        }
        const received = buffered;
        buffered = '';
        return received;
      } finally { clearTimeout(deadline); }
    };
  };
  try {
    assert.equal((await fetch(base, { signal: AbortSignal.timeout(5000) })).status, 401);
    assert.equal((await request('expired', '')).status, 401);
    assert.equal((await request('viewer', '', 'POST', { kind: 'kanban', title: 'Forbidden' })).status, 403);
    assert.equal((await request('a', '', 'POST', { kind: 'kanban', title: 'Bad origin' }, 'https://other.example')).status, 403);
    const created = await (await request('a', '', 'POST', { kind: 'kanban', title: 'Cookie sessions' })).json();
    const readA = await stream('a', created.id);
    const readViewer = await stream('viewer', created.id);
    await readA(/"role":"analyst"/);
    await readViewer(/"role":"viewer"/);
    const operations = ['a', 'b'].map((name, index) => request(name as 'a' | 'b', `/${created.id}/operations`, 'POST', {
      operationId: randomUUID(), operation: { type: 'note-add', id: `note-${index}`, columnId: 'todo', title: name, body: 'Concurrent', color: 'paper' },
    }));
    for (const response of await Promise.all(operations)) assert.equal(response.status, 200);
    assert.equal(Object.keys((await (await request('viewer', `/${created.id}`)).json()).state.notes).length, 2);
    assert.equal((await request('viewer', `/${created.id}/operations`, 'POST', { operationId: randomUUID(), operation: { type: 'note-delete', id: 'note-0' } })).status, 403);
    await db.query('UPDATE users SET role=$2 WHERE email=$1', ['a@example.test', 'viewer']);
    await readA(/"role":"viewer"/);
    assert.equal((await request('a', '', 'POST', { kind: 'drawing', title: 'Revoked writer' })).status, 403);
    await db.query('UPDATE users SET active=false WHERE email=$1', ['a@example.test']);
    await readA(/event: access-ended/);
    assert.equal((await request('a', `/${created.id}`)).status, 401);
    await db.query('DELETE FROM sessions WHERE email=$1', ['viewer@example.test']);
    await readViewer(/event: access-ended/);
    assert.equal((await request('viewer', `/${created.id}/export`)).status, 401);
    assert.equal((await request('b', `/${randomUUID()}`)).status, 404);
  } finally {
    controllers.forEach(controller => controller.abort());
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await close();
  }
});
