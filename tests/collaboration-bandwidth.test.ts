import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import express from 'express';

test('shared lists and known drawing images stay out of database query results', async () => {
  process.env.DEMO_MODE = 'true';
  process.env.DEMO_DB_PATH = path.resolve('tmp', `shared-bandwidth-${randomUUID()}`);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '';
  process.env.GOOGLE_CLIENT_SECRET = '';
  const { db, migrate, close } = await import('../server/db.js');
  const { registerCollaboration } = await import('../server/collaboration.js');
  await migrate();
  const id = randomUUID();
  const file = { id: 'image', mimeType: 'image/png', dataURL: `data:image/png;base64,${'A'.repeat(1_000_000)}`, created: 1 };
  const resource = { id, kind: 'drawing', title: 'Large drawing', revision: 2,
    state: { elements: [{ id: 'element', version: 2 }], files: { image: file, newImage: { ...file, id: 'newImage', dataURL: 'data:image/png;base64,AAAA' } } },
    createdBy: 'a@example.test', updatedAt: new Date().toISOString(), deletedAt: null,
    driveId: null, driveFolder: null, driveRevision: 1, driveError: null };
  await db.query('INSERT INTO shared_resources(id,data,revision) VALUES($1,$2,$3)', [id, JSON.stringify(resource), 2]);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { email: 'a@example.test', name: 'A', role: 'analyst' }; next(); });
  registerCollaboration(app);
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.status || (error.name === 'ZodError' ? 400 : 500)).json({ error: error.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/collaboration`;
  const originalQuery = db.query.bind(db);
  let transferred = 0;
  db.query = async <T = Record<string, any>>(sql: string, args?: any[]) => {
    const result = await originalQuery<T>(sql, args);
    transferred += Buffer.byteLength(JSON.stringify(result.rows));
    return result;
  };
  try {
    const list = await (await fetch(base)).json();
    assert.equal(list[0].title, resource.title);
    assert.equal(list[0].state, undefined);
    assert.ok(transferred < 2000, `List read transferred ${transferred} bytes from DB`);
    console.log(`Shared list DB result: ${transferred} bytes; full resource: ${Buffer.byteLength(JSON.stringify(resource))} bytes`);
    transferred = 0;
    const partial = await (await fetch(`${base}/${id}?knownRevision=1&knownFiles=image`)).json();
    assert.deepEqual(partial.state.elements, resource.state.elements);
    assert.equal(partial.state.files.image, undefined);
    assert.deepEqual(partial.state.files.newImage, resource.state.files.newImage);
    assert.ok(transferred < 2000, `Known image read transferred ${transferred} bytes from DB`);
    console.log(`Changed drawing DB result with cached image: ${transferred} bytes`);
    transferred = 0;
    assert.equal((await fetch(`${base}/${id}?knownRevision=2&knownFiles=image`)).status, 304);
    assert.ok(transferred < 100);
    const full = await (await fetch(`${base}/${id}`)).json();
    assert.deepEqual(full, resource);
    const exported = await (await fetch(`${base}/${id}/export`)).json();
    assert.deepEqual(exported.files, resource.state.files);
    transferred = 0;
    const preview = await fetch(`${base}/${id}/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 2, png: 'iVBORw0KGgo=' }) });
    assert.equal(preview.status, 200);
    assert.ok(transferred < 2000, `Preview read transferred ${transferred} bytes from DB`);
    const afterPreview = await (await fetch(`${base}/${id}`)).json();
    assert.deepEqual(afterPreview.state, resource.state);
    assert.equal(afterPreview.driveRevision, 1);
    // Reloads restore browser images before sending this complete cache manifest.
    const images = Object.fromEntries(Array.from({ length: 70 }, (_, index) => [
      `cached-${index}`, { ...file, id: `cached-${index}`, dataURL: `data:image/png;base64,${'A'.repeat(20_000)}` },
    ]));
    const many = { ...resource, revision: 3, state: { ...resource.state, files: { ...images, newImage: resource.state.files.newImage } } };
    await originalQuery('UPDATE shared_resources SET data=$2,revision=3 WHERE id=$1', [id, JSON.stringify(many)]);
    const snapshot = (body: unknown) => fetch(`${base}/${id}/snapshot`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    transferred = 0;
    const changed = await snapshot({ knownRevision: 2, knownFiles: Object.keys(images) });
    assert.equal(changed.status, 200);
    assert.deepEqual((await changed.json()).state.files, { newImage: resource.state.files.newImage });
    assert.ok(transferred < 2000, `70 browser-cached images transferred ${transferred} bytes from DB`);
    transferred = 0;
    assert.equal((await snapshot({ knownRevision: 3, knownFiles: Object.keys(many.state.files) })).status, 204);
    assert.ok(transferred < 100, 'Unchanged cached resource returns metadata only');
    const cold = await snapshot({ knownFiles: [] });
    assert.deepEqual((await cold.json()).state, many.state, 'A new browser still downloads all images');
    assert.equal((await snapshot({ knownFiles: Array.from({ length: 1001 }, () => 'file') })).status, 400);
    await originalQuery("UPDATE shared_resources SET data=jsonb_set(data,'{deletedAt}',to_jsonb('deleted'::text)) WHERE id=$1", [id]);
    assert.equal((await fetch(`${base}/${id}?knownFiles=image`)).status, 404);
    assert.equal((await snapshot({ knownRevision: 3, knownFiles: Object.keys(images) })).status, 404);
    assert.equal((await (await fetch(base)).json()).length, 0);
    const deleted = await (await fetch(`${base}?deleted=true`)).json();
    assert.equal(deleted[0].id, id);
    assert.equal(deleted[0].state, undefined);
  } finally {
    db.query = originalQuery;
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await close();
  }
});
