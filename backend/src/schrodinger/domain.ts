/**
 * Schrödinger P0 — Domain Model
 *
 * Canonical domain types for the Observation Platform.
 * These extend (not replace) the existing types/schrodinger.ts — the MVP types
 * are the wire format, these are the richer domain objects used internally.
 */

// Re-export MVP types for convenience — keeps imports clean
export type {
  FindingState,
  ScanProgress,
  SchrodingerListener,
  SchrodingerScan,
  TimelineSnapshot,
  VantageFinding,
  VantageId,
  VantageResult,
} from '../types/schrodinger.js';

export type { ScanStatus } from '../types/schrodinger.js';

// ─── Extended Domain Types ───────────────────────────────────────────────────

/** A registered observation target. */
export interface Target {
  id: string;
  domain: string;
  addedBy: string;
  addedAt: string;
  /** Optional notes / reason for adding this target. */
  notes?: string;
}

/**
 * A single run of one vantage point within a scan.
 * Maps 1:N from Scan → VantageRun, and each VantageRun produces Findings.
 */
export interface VantageRun {
  id: string;
  scanId: string;
  vantageId: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'completed' | 'failed';
  findingCount: number;
}

/** Audit trail event — who did what, when. */
export interface AuditEvent {
  id: string;
  action: AuditAction;
  actor: string;
  /** Target domain if applicable. */
  target?: string;
  /** Scan ID if applicable. */
  scanId?: string;
  ts: string;
  detail: Record<string, unknown>;
}

export type AuditAction =
  | 'scan.created'
  | 'scan.completed'
  | 'scan.failed'
  | 'scan.cancelled'
  | 'target.blocked'
  | 'ssrf.blocked';
