import test from 'node:test';
import assert from 'node:assert/strict';
import { withTransactionLock } from '../server/transaction-lock.js';

test('collaboration locks pin the transaction before locking and commit before release', async () => {
 const calls: string[] = [];
 const client = { query: async (sql: string) => { calls.push(sql); return { rows: [] }; } };
 const value = await withTransactionLock(client, 'resource', async tx => { await tx.query('UPDATE'); return 2; });
 assert.equal(value, 2);
 assert.deepEqual(calls, ['BEGIN', 'SELECT pg_advisory_xact_lock(hashtext($1))', 'UPDATE', 'COMMIT']);
});
test('failed collaboration writes roll back and release transaction locks', async () => {
 const calls: string[] = [];
 const client = { query: async (sql: string) => { calls.push(sql); return { rows: [] }; } };
 await assert.rejects(withTransactionLock(client, 'resource', async () => { throw new Error('write failed'); }), /write failed/);
 assert.equal(calls.at(-1), 'ROLLBACK');
 assert.ok(!calls.includes('COMMIT'));
});
