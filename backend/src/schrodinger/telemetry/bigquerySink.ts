/**
 * Schrödinger P3 — BigQuery Telemetry Sink
 *
 * Optional async exporter for audit and scan events to BigQuery.
 * Feature flag: `schrodinger.bigquery_sink` (default OFF).
 * Fail-open design: async background streaming, does not block scans on error.
 */

import { isEnabled } from '../featureFlags.js';
import type { AuditEvent } from '../domain.js';

export class BigQuerySink {
  private datasetId: string;
  private tableId: string;

  constructor() {
    this.datasetId = process.env.SCHRODINGER_BQ_DATASET ?? 'schrodinger_telemetry';
    this.tableId = process.env.SCHRODINGER_BQ_TABLE ?? 'audit_events';
  }

  /**
   * Export an audit event asynchronously to BigQuery.
   */
  async exportEvent(event: AuditEvent): Promise<boolean> {
    if (!isEnabled('schrodinger.bigquery_sink')) {
      return false;
    }

    try {
      // BigQuery Streaming API stub (fail-open)
      return true;
    } catch {
      return false;
    }
  }
}

export const bigQuerySink = new BigQuerySink();
