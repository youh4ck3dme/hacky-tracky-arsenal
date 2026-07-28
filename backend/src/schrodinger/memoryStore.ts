/**
 * Schrödinger P0 — In-Memory Store
 *
 * Default ScanStore implementation. Mirrors the original scanner's Map-based
 * storage but implements the pluggable interface. Evicts oldest scans when
 * capacity is exceeded.
 */

import type { SchrodingerScan } from '../types/schrodinger.js';
import type { ScanStore } from './store.js';

export class InMemoryStore implements ScanStore {
  private scans = new Map<string, SchrodingerScan>();

  constructor(private readonly maxScans = 100) {}

  async saveScan(scan: SchrodingerScan): Promise<void> {
    this.scans.set(scan.id, scan);
    this.evict();
  }

  async getScan(id: string): Promise<SchrodingerScan | undefined> {
    return this.scans.get(id);
  }

  async listScans(limit = 50): Promise<SchrodingerScan[]> {
    return [...this.scans.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async deleteScan(id: string): Promise<boolean> {
    return this.scans.delete(id);
  }

  async count(): Promise<number> {
    return this.scans.size;
  }

  /** Evict oldest scans when over capacity. */
  private evict(): void {
    if (this.scans.size <= this.maxScans) return;

    const sorted = [...this.scans.entries()].sort((a, b) =>
      a[1].createdAt.localeCompare(b[1].createdAt),
    );

    while (this.scans.size > this.maxScans && sorted.length > 0) {
      const oldest = sorted.shift();
      if (oldest) this.scans.delete(oldest[0]);
    }
  }
}
