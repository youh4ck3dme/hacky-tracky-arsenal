import type { ArsenalStatusResponse } from '../types';
import { openArsenalDb, STATUS_STORE } from './db';

export async function saveStatusCache(status: ArsenalStatusResponse): Promise<void> {
  const db = await openArsenalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATUS_STORE, 'readwrite');
    tx.objectStore(STATUS_STORE).put(status, 'latest');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadStatusCache(): Promise<ArsenalStatusResponse | null> {
  try {
    const db = await openArsenalDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STATUS_STORE, 'readonly');
      const req = tx.objectStore(STATUS_STORE).get('latest');
      req.onsuccess = () => resolve((req.result as ArsenalStatusResponse) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
