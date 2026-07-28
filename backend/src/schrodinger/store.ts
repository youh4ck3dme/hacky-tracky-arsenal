/**
 * Schrödinger P0 — ScanStore Interface
 *
 * Pluggable persistence for scan data. The scanner service depends on this
 * interface, not a concrete implementation.
 *
 * Implementations:
 * - InMemoryStore (default, always available)
 * - FileJsonStore (optional, write to disk)
 * - PostgresStore (adapter stub, behind feature flag)
 */

import type { SchrodingerScan } from '../types/schrodinger.js';

export interface ScanStore {
  /** Persist a scan (insert or update). */
  saveScan(scan: SchrodingerScan): Promise<void>;

  /** Retrieve a scan by ID. Returns undefined if not found. */
  getScan(id: string): Promise<SchrodingerScan | undefined>;

  /** List scans, newest first. Default limit 50. */
  listScans(limit?: number): Promise<SchrodingerScan[]>;

  /** Delete a scan by ID. Returns true if it existed. */
  deleteScan(id: string): Promise<boolean>;

  /** Return the number of stored scans. */
  count(): Promise<number>;
}
