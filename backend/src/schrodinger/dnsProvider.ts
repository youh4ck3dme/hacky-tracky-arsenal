/**
 * Schrödinger P0 — DNS Provider Interface
 *
 * Abstraction for DNS resolution. The scanner currently shells out to `dig`
 * directly. This interface allows:
 * 1. Deterministic testing via MockDnsProvider
 * 2. Future multi-record, multi-provider support (P1)
 * 3. SSRF validation hook point (resolve → validate → connect)
 */

export interface DnsResult {
  /** The resolver used (IP or name). */
  resolver: string;
  /** Record type queried. */
  recordType: DnsRecordType;
  /** Resolved addresses/values. Empty on error. */
  answers: string[];
  /** Time taken in milliseconds. */
  durationMs: number;
  /** Error message if resolution failed. */
  error?: string;
}

export type DnsRecordType = 'A' | 'AAAA' | 'MX' | 'TXT' | 'CNAME' | 'NS' | 'SOA';

export interface DnsProvider {
  /**
   * Resolve a domain using a specific resolver.
   * Returns answers for the given record type.
   */
  resolve(
    domain: string,
    recordType: DnsRecordType,
    resolver: string,
  ): Promise<DnsResult>;

  /** Human-readable provider name (for logging/audit). */
  readonly name: string;
}
