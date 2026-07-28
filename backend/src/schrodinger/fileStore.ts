/**
 * Schrödinger P0 — File JSON Store
 *
 * Optional ScanStore that persists scan data to a JSON file on disk.
 * Activated via SCHRODINGER_STORE_FILE env variable.
 *
 * Write strategy: full rewrite on every save (acceptable for P0 volume).
 * P1 can switch to append-only or proper DB.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { SchrodingerScan } from '../types/schrodinger.js';
import type { ScanStore } from './store.js';

interface FileData {
  version: 1;
  scans: SchrodingerScan[];
}

export class FileJsonStore implements ScanStore {
  private scans = new Map<string, SchrodingerScan>();
  private readonly filePath: string;
  private readonly maxScans: number;

  constructor(filePath: string, maxScans = 200) {
    this.filePath = path.resolve(filePath);
    this.maxScans = maxScans;
    this.loadFromDisk();
  }

  async saveScan(scan: SchrodingerScan): Promise<void> {
    this.scans.set(scan.id, scan);
    this.evict();
    await this.writeToDisk();
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
    const existed = this.scans.delete(id);
    if (existed) await this.writeToDisk();
    return existed;
  }

  async count(): Promise<number> {
    return this.scans.size;
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const data: FileData = JSON.parse(raw);
      if (data.version === 1 && Array.isArray(data.scans)) {
        for (const scan of data.scans) {
          this.scans.set(scan.id, scan);
        }
      }
    } catch {
      // Corrupted file — start fresh
      console.warn(`[FileJsonStore] Could not load ${this.filePath}, starting fresh`);
    }
  }

  private async writeToDisk(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data: FileData = {
      version: 1,
      scans: [...this.scans.values()].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    };

    // Atomic write via temp file
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, this.filePath);
  }

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
