/**
 * Schrödinger P0 — PostgresStore (Adapter Stub)
 *
 * This file defines the adapter interface and a stub implementation for
 * Cloud SQL Postgres persistence. The actual implementation is behind the
 * `schrodinger.persist.postgres` feature flag (default OFF).
 *
 * P1 will fill in the real pg client, connection pooling, and migrations.
 *
 * Expected Secret Manager keys for production:
 *   - schrodinger-postgres-connection-string
 *   - schrodinger-postgres-ca-cert (if using SSL)
 *
 * Schema DDL (for reference — not executed by this stub):
 *
 *   CREATE TABLE schrodinger_scans (
 *     id            UUID PRIMARY KEY,
 *     target        TEXT NOT NULL,
 *     status        TEXT NOT NULL CHECK (status IN ('queued','running','completed','failed','cancelled')),
 *     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     finished_at   TIMESTAMPTZ,
 *     vantages      JSONB NOT NULL DEFAULT '[]',
 *     matrix        JSONB NOT NULL DEFAULT '[]',
 *     timeline      JSONB NOT NULL DEFAULT '[]',
 *     error         TEXT
 *   );
 *
 *   CREATE INDEX idx_scans_target ON schrodinger_scans (target);
 *   CREATE INDEX idx_scans_status ON schrodinger_scans (status);
 *   CREATE INDEX idx_scans_created ON schrodinger_scans (created_at DESC);
 *
 *   CREATE TABLE schrodinger_audit_events (
 *     id        UUID PRIMARY KEY,
 *     action    TEXT NOT NULL,
 *     actor     TEXT NOT NULL,
 *     target    TEXT,
 *     scan_id   UUID REFERENCES schrodinger_scans(id),
 *     ts        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     detail    JSONB NOT NULL DEFAULT '{}'
 *   );
 *
 *   CREATE INDEX idx_audit_scan ON schrodinger_audit_events (scan_id);
 *   CREATE INDEX idx_audit_action ON schrodinger_audit_events (action);
 */

import type { SchrodingerScan } from '../types/schrodinger.js';
import type { ScanStore } from './store.js';

export class PostgresStore implements ScanStore {
  constructor(
    private readonly _connectionString?: string,
  ) {
    // P1: Initialize pg Pool here
    if (!_connectionString) {
      console.warn('[PostgresStore] No connection string — stub mode');
    }
  }

  async saveScan(_scan: SchrodingerScan): Promise<void> {
    throw new Error(
      'PostgresStore is not implemented yet. Enable feature flag schrodinger.persist.postgres in P1.',
    );
  }

  async getScan(_id: string): Promise<SchrodingerScan | undefined> {
    throw new Error('PostgresStore is not implemented yet.');
  }

  async listScans(_limit?: number): Promise<SchrodingerScan[]> {
    throw new Error('PostgresStore is not implemented yet.');
  }

  async deleteScan(_id: string): Promise<boolean> {
    throw new Error('PostgresStore is not implemented yet.');
  }

  async count(): Promise<number> {
    throw new Error('PostgresStore is not implemented yet.');
  }
}
