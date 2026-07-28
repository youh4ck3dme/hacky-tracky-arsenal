/**
 * Schrödinger P0 — Audit Log
 *
 * In-memory ring buffer for audit events. Tracks who/what/when for every
 * security-relevant action in the scanner.
 *
 * Designed to be queryable by scanId, action, or actor for forensic review.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AuditAction, AuditEvent } from './domain.js';

export class AuditLog {
  private buffer: AuditEvent[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  /** Append a new audit event. Returns the created event. */
  append(
    action: AuditAction,
    actor: string,
    detail: Record<string, unknown> = {},
    opts?: { target?: string; scanId?: string },
  ): AuditEvent {
    const event: AuditEvent = {
      id: uuidv4(),
      action,
      actor,
      target: opts?.target,
      scanId: opts?.scanId,
      ts: new Date().toISOString(),
      detail,
    };

    this.buffer.push(event);

    // Ring buffer: drop oldest when over capacity
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize);
    }

    return event;
  }

  /** Query events with optional filters. Returns newest-first. */
  query(filter?: {
    action?: AuditAction;
    scanId?: string;
    actor?: string;
    limit?: number;
  }): AuditEvent[] {
    let events = [...this.buffer];

    if (filter?.action) {
      events = events.filter((e) => e.action === filter.action);
    }
    if (filter?.scanId) {
      events = events.filter((e) => e.scanId === filter.scanId);
    }
    if (filter?.actor) {
      events = events.filter((e) => e.actor === filter.actor);
    }

    // Newest first
    events.reverse();

    if (filter?.limit && filter.limit > 0) {
      events = events.slice(0, filter.limit);
    }

    return events;
  }

  /** Get all events (newest first). */
  getAll(): AuditEvent[] {
    return [...this.buffer].reverse();
  }

  /** Current buffer size. */
  get size(): number {
    return this.buffer.length;
  }

  /** Clear all events (for testing). */
  clear(): void {
    this.buffer = [];
  }
}

/** Singleton audit log instance, configured from config. */
let _auditLog: AuditLog | null = null;

export function getAuditLog(): AuditLog {
  if (!_auditLog) {
    // Lazy import to avoid circular dependency with config
    _auditLog = new AuditLog(1000);
  }
  return _auditLog;
}

/** Reset the singleton (for testing). */
export function resetAuditLog(): void {
  _auditLog = null;
}
