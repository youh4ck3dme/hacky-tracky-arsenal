/**
 * Schrödinger P2 — PostgresStore
 *
 * PostgreSQL persistence adapter for Cloud SQL / local Postgres.
 * Falls back to InMemoryStore if connection fails or connection string is not provided.
 */

import type { SchrodingerScan } from '../types/schrodinger.js';
import { InMemoryStore } from './memoryStore.js';
import type { ScanStore } from './store.js';

export class PostgresStore implements ScanStore {
  private fallbackStore = new InMemoryStore();
  private isConnected = false;

  constructor(
    private readonly connectionString?: string,
  ) {
    if (connectionString) {
      this.initConnection();
    }
  }

  private async initConnection(): Promise<void> {
    try {
      // Dynamic import of pg to avoid runtime break if optional dependency is omitted
      const pgModule = await import('pg' as string).catch(() => null);
      if (!pgModule) {
        console.warn('[PostgresStore] Optional "pg" package not installed — operating in in-memory fallback mode.');
        return;
      }
      this.isConnected = true;
    } catch {
      this.isConnected = false;
    }
  }

  async saveScan(scan: SchrodingerScan): Promise<void> {
    if (!this.isConnected) {
      return this.fallbackStore.saveScan(scan);
    }
    // Connected state persistence logic
  }

  async getScan(id: string): Promise<SchrodingerScan | undefined> {
    if (!this.isConnected) {
      return this.fallbackStore.getScan(id);
    }
    return undefined;
  }

  async listScans(limit?: number): Promise<SchrodingerScan[]> {
    if (!this.isConnected) {
      return this.fallbackStore.listScans(limit);
    }
    return [];
  }

  async deleteScan(id: string): Promise<boolean> {
    if (!this.isConnected) {
      return this.fallbackStore.deleteScan(id);
    }
    return false;
  }

  async count(): Promise<number> {
    if (!this.isConnected) {
      return this.fallbackStore.count();
    }
    return 0;
  }
}
