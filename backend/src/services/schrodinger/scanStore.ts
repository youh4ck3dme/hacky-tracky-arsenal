import fs from 'node:fs';
import path from 'node:path';
import type { SchrodingerScan } from '../../types/schrodinger.js';

interface PersistedScans {
  scans: SchrodingerScan[];
}

/**
 * File-backed persistence adapter for Schrödinger scans (P0).
 * Keeps last N scans across process restarts; marks in-flight as failed on load.
 */
export class ScanStore {
  private scans = new Map<string, SchrodingerScan>();
  private readonly maxScans: number;

  constructor(
    private readonly filePath: string,
    maxScans = 20,
  ) {
    this.maxScans = maxScans;
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(raw) as PersistedScans;
      for (const scan of data.scans ?? []) {
        if (scan.status === 'running' || scan.status === 'queued') {
          scan.status = 'failed';
          scan.error = scan.error ?? 'Interrupted by restart';
          scan.finishedAt = scan.finishedAt ?? new Date().toISOString();
        }
        // Backfill P1 fields for older snapshots
        if (scan.risk_score === undefined) scan.risk_score = null;
        if (!scan.notices) scan.notices = [];
        this.scans.set(scan.id, scan);
      }
    } catch {
      // ignore corrupt persistence
    }
  }

  private persist(): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const scans = Array.from(this.scans.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, this.maxScans);
    fs.writeFileSync(this.filePath, JSON.stringify({ scans }, null, 2));
  }

  get(id: string): SchrodingerScan | undefined {
    return this.scans.get(id);
  }

  set(scan: SchrodingerScan): void {
    this.scans.set(scan.id, scan);
    if (this.scans.size > this.maxScans) {
      const oldest = [...this.scans.entries()].sort((a, b) =>
        a[1].createdAt.localeCompare(b[1].createdAt),
      )[0];
      if (oldest) this.scans.delete(oldest[0]);
    }
    this.persist();
  }

  list(limit = 20): SchrodingerScan[] {
    return Array.from(this.scans.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}
