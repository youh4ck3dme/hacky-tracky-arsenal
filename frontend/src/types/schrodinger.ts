export type FindingState = 'collapsed' | 'quantum' | 'absent' | 'temporal';
export type VantageId = 'dns' | 'ua' | 'netweb' | 'time';
export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface VantageFinding {
  id: string;
  label: string;
  detail: string;
  state: FindingState;
  vantage: VantageId;
}

export interface VantageResult {
  id: VantageId;
  name: string;
  findings: VantageFinding[];
  summary: string;
}

export interface TimelineSnapshot {
  period: string;
  totalSnapshots: number;
  uniquePaths: number;
  samplePaths: string[];
  statuses: Record<string, number>;
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
}

export interface ScanProgress {
  vantage: VantageId | 'classify' | 'done';
  label: string;
  current: number;
  total: number;
}
