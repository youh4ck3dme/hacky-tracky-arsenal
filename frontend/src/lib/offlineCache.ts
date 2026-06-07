import type { ArsenalStatusResponse } from '../types';

const DB_NAME = 'arsenal-pwa';
const DB_VERSION = 1;
const STORE_NAME = 'status';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveStatusCache(status: ArsenalStatusResponse): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(status, 'latest');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadStatusCache(): Promise<ArsenalStatusResponse | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('latest');
      req.onsuccess = () => resolve((req.result as ArsenalStatusResponse) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
