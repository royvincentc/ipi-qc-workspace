import type { DB } from './db.js';

/** Transaction-scoped locks also work when PostgreSQL uses a transaction pooler. */
export async function withTransactionLock<T>(client: DB, key: string, fn: (tx: DB) => Promise<T>): Promise<T> {
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
