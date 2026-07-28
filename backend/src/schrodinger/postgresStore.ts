/**
 * Schrödinger P2 — PostgresStore
 *
 * PostgreSQL persistence adapter for Cloud SQL / local Postgres.
 * Falls back to InMemoryStore if connection fails or connection string is not provided.
 */

import pg from 'pg';
import type { SchrodingerScan } from '../types/schrodinger.js';
import { InMemoryStore } from './memoryStore.js';
import type { ScanStore } from './store.js';

export class PostgresStore implements ScanStore {
  private fallbackStore = new InMemoryStore();
  private pool: pg.Pool | null = null;
  private isConnected = false;

  constructor(
    private readonly connectionString?: string,
  ) {
    if (connectionString) {
      this.initConnection(connectionString);
    }
  }

  private initConnection(connectionString: string): void {
    try {
      this.pool = new pg.Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
      });

      // Quick test query to verify connection
      this.pool.query('SELECT 1')
        .then(() => {
          this.isConnected = true;
        })
        .catch((err) => {
          console.warn('[PostgresStore] Database connection failed — operating in in-memory fallback mode.', err.message);
          this.isConnected = false;
        });
    } catch (err) {
      console.warn('[PostgresStore] Initialization failed — operating in in-memory fallback mode.');
      this.isConnected = false;
    }
  }

  async saveScan(scan: SchrodingerScan): Promise<void> {
    if (!this.isConnected || !this.pool) {
      return this.fallbackStore.saveScan(scan);
    }

    try {
      await this.pool.query(
        `INSERT INTO scans (id, target, status, created_at, finished_at, vantages, matrix, timeline, error, risk_score, notices, mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           finished_at = EXCLUDED.finished_at,
           vantages = EXCLUDED.vantages,
           matrix = EXCLUDED.matrix,
           timeline = EXCLUDED.timeline,
           error = EXCLUDED.error,
           risk_score = EXCLUDED.risk_score,
           notices = EXCLUDED.notices,
           mode = EXCLUDED.mode`,
        [
          scan.id,
          scan.target,
          scan.status,
          scan.createdAt,
          scan.finishedAt,
          JSON.stringify(scan.vantages),
          JSON.stringify(scan.matrix),
          JSON.stringify(scan.timeline),
          scan.error,
          scan.risk_score,
          scan.notices,
          JSON.stringify(scan.mode),
        ]
      );
    } catch (err) {
      console.error('[PostgresStore] saveScan error:', err);
      return this.fallbackStore.saveScan(scan);
    }
  }

  async getScan(id: string): Promise<SchrodingerScan | undefined> {
    if (!this.isConnected || !this.pool) {
      return this.fallbackStore.getScan(id);
    }

    try {
      const res = await this.pool.query('SELECT * FROM scans WHERE id = $1', [id]);
      const row = res.rows[0];
      if (!row) return undefined;

      return {
        id: row.id,
        target: row.target,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
        vantages: row.vantages,
        matrix: row.matrix,
        timeline: row.timeline,
        error: row.error,
        risk_score: row.risk_score,
        notices: row.notices || [],
        mode: row.mode,
      };
    } catch (err) {
      console.error('[PostgresStore] getScan error:', err);
      return this.fallbackStore.getScan(id);
    }
  }

  async listScans(limit = 20): Promise<SchrodingerScan[]> {
    if (!this.isConnected || !this.pool) {
      return this.fallbackStore.listScans(limit);
    }

    try {
      const res = await this.pool.query('SELECT * FROM scans ORDER BY created_at DESC LIMIT $1', [limit]);
      return res.rows.map((row) => ({
        id: row.id,
        target: row.target,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
        vantages: row.vantages,
        matrix: row.matrix,
        timeline: row.timeline,
        error: row.error,
        risk_score: row.risk_score,
        notices: row.notices || [],
        mode: row.mode,
      }));
    } catch (err) {
      console.error('[PostgresStore] listScans error:', err);
      return this.fallbackStore.listScans(limit);
    }
  }

  async deleteScan(id: string): Promise<boolean> {
    if (!this.isConnected || !this.pool) {
      return this.fallbackStore.deleteScan(id);
    }

    try {
      const res = await this.pool.query('DELETE FROM scans WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      console.error('[PostgresStore] deleteScan error:', err);
      return this.fallbackStore.deleteScan(id);
    }
  }

  async count(): Promise<number> {
    if (!this.isConnected || !this.pool) {
      return this.fallbackStore.count();
    }

    try {
      const res = await this.pool.query('SELECT COUNT(*) FROM scans');
      return parseInt(res.rows[0].count, 10);
    } catch (err) {
      console.error('[PostgresStore] count error:', err);
      return this.fallbackStore.count();
    }
  }

  /**
   * Save a snapshot for Shadow Diff.
   */
  async saveShadowSnapshot(target: string, vantages: any[], matrix: any[]): Promise<void> {
    if (!this.isConnected || !this.pool) {
      return;
    }

    try {
      await this.pool.query(
        `INSERT INTO shadow_snapshots (target, saved_at, vantages, matrix)
         VALUES ($1, NOW(), $2, $3)`,
        [target, JSON.stringify(vantages), JSON.stringify(matrix)]
      );
    } catch (err) {
      console.error('[PostgresStore] saveShadowSnapshot error:', err);
    }
  }
}
