export type FindingState = 'collapsed' | 'quantum' | 'absent' | 'temporal';
export type VantageId = 'dns' | 'ua' | 'netweb' | 'time';
export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type FindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

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
  counts?: VantageCounts;
  score?: number;
  meta?: Record<string, unknown>;
}

export interface TimelineSnapshot {
  period: string;
  totalSnapshots: number;
  uniquePaths: number;
  samplePaths: string[];
  statuses: Record<string, number>;
}

export interface ScanModeInfo {
  scanMode: 'live' | 'mock';
  dnsMode: 'auto' | 'dig' | 'mock';
  dnsProvider: 'dig' | 'mock';
  dohEnabled: boolean;
  portProfile: 'quick' | 'web';
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
  risk_score: number | null;
  notices: string[];
  mode?: ScanModeInfo;
}

export interface ScanProgress {
  vantage: VantageId | 'classify' | 'done';
  label: string;
  current: number;
  total: number;
}
