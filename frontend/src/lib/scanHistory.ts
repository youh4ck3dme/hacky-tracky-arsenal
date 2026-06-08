import { openArsenalDb, SCANS_STORE } from './db';
import type { ScanSnapshot } from './shadowDiff';

/** Persist the latest completed scan for a target (Shadow Diff baseline). */
export async function saveScanSnapshot(snapshot: ScanSnapshot): Promise<void> {
  const db = await openArsenalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCANS_STORE, 'readwrite');
    tx.objectStore(SCANS_STORE).put(snapshot, snapshot.target);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load the previously cached scan for a target, or null if none. */
export async function loadScanSnapshot(target: string): Promise<ScanSnapshot | null> {
  try {
    const db = await openArsenalDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SCANS_STORE, 'readonly');
      const req = tx.objectStore(SCANS_STORE).get(target);
      req.onsuccess = () => resolve((req.result as ScanSnapshot) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
