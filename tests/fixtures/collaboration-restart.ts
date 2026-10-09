import assert from 'node:assert/strict';
import { db, migrate, close } from '../../server/db.js';
import { mutateSharedResource, resourceById, sharedSnapshot } from '../../server/collaboration.js';
import { initialState } from '../../shared/collaboration.js';

const id = process.env.RESTART_RESOURCE_ID!;
const operationId = process.env.RESTART_OPERATION_ID!;
const operation = { type: 'scene', elements: [], files: { image: { id: 'image', mimeType: 'image/png', created: 1, dataURL: 'data:image/png;base64,iVBORw0KGgo=' } } };
try {
  await migrate();
  if (process.argv[2] === 'write') {
    const data = { id, title: 'Restart recovery', kind: 'drawing', state: initialState('drawing'), revision: 1, driveRevision: 0, driveId: null, driveFolder: null, driveError: null, createdBy: 'a@example.test', updatedBy: 'a@example.test', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null };
    await db.query('INSERT INTO shared_resources(id,data,revision,drive_revision) VALUES($1,$2,1,0)', [id, JSON.stringify(data)]);
    assert.equal((await mutateSharedResource(id, operationId, operation, 'a@example.test')).revision, 2);
  } else {
    const recovered = await resourceById(id);
    assert.equal(recovered.revision, 2);
    const snapshot = sharedSnapshot(recovered) as any;
    assert.equal(snapshot.files.image.dataURL, operation.files.image.dataURL);
    assert.equal((await mutateSharedResource(id, operationId, operation, 'a@example.test')).revision, 2);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM shared_operations WHERE resource_id=$1', [id])).rows[0].count, 1);
  }
  console.log(JSON.stringify({ phase: process.argv[2], recoveredImage: true, revision: 2 }));
} finally { await close(); }
