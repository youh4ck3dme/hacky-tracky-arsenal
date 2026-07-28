export type FindingState = 'collapsed' | 'quantum' | 'absent' | 'temporal';
export type VantageId = 'dns' | 'ua' | 'netweb' | 'time';
export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type FindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type DnsMode = 'auto' | 'dig' | 'mock';
export type ScanMode = 'live' | 'mock';
export type PortProfile = 'quick' | 'web';

export interface VantageFinding {
  id: string;
  label: string;
  detail: string;
  state: FindingState;
  vantage: VantageId;
  severity?: FindingSeverity;
  risk_score?: number;
  next_actions?: string[];
}

export interface VantageCounts {
  collapsed: number;
  quantum: number;
  temporal: number;
  absent: number;
}

export interface VantageResult {
  id: VantageId;
  name: string;
  findings: VantageFinding[];
  summary: string;
  /** Per-column counts for UI badges. */
  counts?: VantageCounts;
  /** Consistency (DNS) or local risk contribution 0–100. */
  score?: number;
  /** Provider / probe metadata (mode, sample size, consistency…). */
  meta?: Record<string, unknown>;
}

/**
 * A single period (year) in the Palimpsest timeline — reconstructed from the
 * Wayback Machine. Powers the time-slider UI: attack surface as sediment.
 */
export interface TimelineSnapshot {
  period: string;
  totalSnapshots: number;
  uniquePaths: number;
  samplePaths: string[];
  statuses: Record<string, number>;
}

export interface ScanModeInfo {
  scanMode: ScanMode;
  dnsMode: DnsMode;
  dnsProvider: 'dig' | 'mock';
  dohEnabled: boolean;
  portProfile: PortProfile;
  enabledVantages: VantageId[];
}

export interface SchrodingerScan {
  id: string;
  target: string;
  status: ScanStatus;
  createdAt: string;
  finishedAt: string | null;
  vantages: VantageResult[];
  matrix: VantageFinding[];
  timeline: TimelineSnapshot[];
  error: string | null;
  /** Aggregate risk 0–100 from the rule engine (null while running). */
  risk_score: number | null;
  /** Operator-facing degraded / empty-state messages (SK). */
  notices: string[];
  mode?: ScanModeInfo;
}

export interface ScanProgress {
  vantage: VantageId | 'classify' | 'done';
  label: string;
  current: number;
  total: number;
}

export type SchrodingerListener = (event: string, data: unknown) => void;

export interface MatrixClassification {
  findings: VantageFinding[];
  risk_score: number;
}
