/**
 * Shared IndexedDB opener for the Arsenal PWA.
 *
 * One database, two stores:
 *  - `status`: last cached arsenal status (offline dashboard)
 *  - `scans`:  last completed Schrödinger scan per target (Shadow Diff baseline)
 */
const DB_NAME = 'arsenal-pwa';
const DB_VERSION = 2;

export const STATUS_STORE = 'status';
export const SCANS_STORE = 'scans';

export function openArsenalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STATUS_STORE)) {
        db.createObjectStore(STATUS_STORE);
      }
      if (!db.objectStoreNames.contains(SCANS_STORE)) {
        db.createObjectStore(SCANS_STORE);
      }
    };
  });
}
