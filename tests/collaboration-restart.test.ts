import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('a fresh backend process recovers drawing assets and deduplicates an acknowledged operation', { timeout: 45000 }, async () => {
  const env = { ...process.env, DEMO_MODE: 'true', DEMO_DB_PATH: path.resolve('tmp', `shared-restart-${randomUUID()}`), GOOGLE_APPLICATION_CREDENTIALS: '', GOOGLE_CLIENT_SECRET: '', RESTART_RESOURCE_ID: randomUUID(), RESTART_OPERATION_ID: randomUUID() };
  const run = promisify(execFile);
  for (const phase of ['write', 'recover']) {
    const result = await run(process.execPath, ['--import', 'tsx', 'tests/fixtures/collaboration-restart.ts', phase], { env, timeout: 20000, windowsHide: true });
    assert.match(result.stdout, new RegExp(`"phase":"${phase}"`));
    assert.match(result.stdout, /"revision":2/);
  }
});
