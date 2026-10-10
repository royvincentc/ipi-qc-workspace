import type { SharedOperation, SharedResource } from '../shared/collaboration';

export type PendingChange = { operationId: string; operation: SharedOperation };
let database: Promise<IDBDatabase> | undefined;
function open() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('ipi-shared', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('resources');
      request.result.createObjectStore('outbox');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
  });
}

/** Snapshot and unsent operations live in the browser database, scoped to the signed-in user. */
export async function loadLocal(key: string) {
  const db = await open();
  return new Promise<{ resource?: SharedResource; pending: PendingChange[] }>((resolve, reject) => {
    const tx = db.transaction(['resources', 'outbox']);
    const snapshot = tx.objectStore('resources').get(key);
    const changes = tx.objectStore('outbox').getAll();
    tx.oncomplete = () => resolve({
      resource: snapshot.result,
      pending: changes.result.filter(item => item.key === key).sort((a, b) => a.order - b.order).map(item => item.change),
    });
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveLocal(key: string, resource: SharedResource | undefined, pending: PendingChange[], acknowledged: string[] = []) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['resources', 'outbox'], 'readwrite');
    if (resource) tx.objectStore('resources').put(resource, key);
    pending.forEach((change, index) => tx.objectStore('outbox').put({ key, change, order: Date.now() + index / 1000 }, `${key}:${change.operationId}`));
    acknowledged.forEach(id => tx.objectStore('outbox').delete(`${key}:${id}`));
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
}

export async function listLocal(email: string) {
  const db = await open();
  return new Promise<SharedResource[]>((resolve, reject) => {
    const tx = db.transaction('resources');
    const keys = tx.objectStore('resources').getAllKeys();
    const values = tx.objectStore('resources').getAll();
    tx.oncomplete = () => resolve(values.result.filter((_value, index) => String(keys.result[index]).startsWith(`ipi:shared-pending:${email}:`)));
    tx.onabort = () => reject(tx.error);
  });
}
