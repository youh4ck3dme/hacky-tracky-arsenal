import type { VantageFinding, VantageResult } from '../../../types/schrodinger.js';

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';

export interface DnsRecordSet {
  type: DnsRecordType;
  values: string[];
}

export interface ResolverAnswer {
  resolver: string;
  ok: boolean;
  records: DnsRecordSet[];
  /** Sorted A records used for consistency / split-horizon. */
  aRecords: string[];
  error?: string;
  latencyMs?: number;
}

export interface DnsScanOptions {
  sampleSize: number;
  concurrency: number;
  timeoutMs: number;
  retries: number;
  resolversPath: string;
  onProgress?: (current: number, total: number, label: string) => void;
}

export interface DnsScanOutcome {
  vantage: VantageResult;
  /** Safe public A/AAAA candidates for SSRF re-check + connect. */
  resolvedIps: string[];
  provider: 'dig' | 'mock';
  notices: string[];
}

export interface DnsProvider {
  readonly id: 'dig' | 'mock';
  scan(target: string, options: DnsScanOptions): Promise<DnsScanOutcome>;
}

export function countStates(findings: VantageFinding[]): {
  collapsed: number;
  quantum: number;
  temporal: number;
  absent: number;
} {
  const counts = { collapsed: 0, quantum: 0, temporal: 0, absent: 0 };
  for (const f of findings) {
    counts[f.state] += 1;
  }
  return counts;
}
