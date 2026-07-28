/**
 * Schrödinger P0 — Mock DNS Provider
 *
 * Deterministic DNS fixtures for testing. Returns hardcoded answers based on
 * domain, allowing SSRF tests (internal IPs) and scan tests (public IPs)
 * without network access.
 */

import type { DnsProvider, DnsRecordType, DnsResult } from './dnsProvider.js';

/** Fixture entry: domain → record type → answers. */
export interface DnsFixture {
  domain: string;
  recordType: DnsRecordType;
  answers: string[];
  /** Optional: simulate an error instead of returning answers. */
  error?: string;
}

const DEFAULT_FIXTURES: DnsFixture[] = [
  // Public domains — should pass SSRF checks
  { domain: 'example.com', recordType: 'A', answers: ['93.184.216.34'] },
  { domain: 'example.org', recordType: 'A', answers: ['93.184.216.34'] },
  { domain: 'test.example.com', recordType: 'A', answers: ['93.184.216.34'] },

  // Split-horizon test — same domain, two different IPs from different resolvers
  { domain: 'split.example.com', recordType: 'A', answers: ['93.184.216.34', '104.16.132.229'] },

  // SSRF test targets — should be BLOCKED
  { domain: 'internal.test', recordType: 'A', answers: ['10.0.0.1'] },
  { domain: 'metadata.test', recordType: 'A', answers: ['169.254.169.254'] },
  { domain: 'loopback.test', recordType: 'A', answers: ['127.0.0.1'] },
  { domain: 'private172.test', recordType: 'A', answers: ['172.16.0.1'] },
  { domain: 'private192.test', recordType: 'A', answers: ['192.168.1.1'] },
  { domain: 'linklocal.test', recordType: 'A', answers: ['169.254.1.1'] },

  // DNS failure test
  { domain: 'timeout.test', recordType: 'A', answers: [], error: 'SERVFAIL' },

  // No records test
  { domain: 'nxdomain.test', recordType: 'A', answers: [] },
];

export class MockDnsProvider implements DnsProvider {
  readonly name = 'mock';
  private fixtures: DnsFixture[];

  constructor(fixtures?: DnsFixture[]) {
    this.fixtures = fixtures ?? DEFAULT_FIXTURES;
  }

  /** Add or replace a fixture at runtime (useful for per-test customization). */
  addFixture(fixture: DnsFixture): void {
    this.fixtures = this.fixtures.filter(
      (f) => !(f.domain === fixture.domain && f.recordType === fixture.recordType),
    );
    this.fixtures.push(fixture);
  }

  async resolve(
    domain: string,
    recordType: DnsRecordType,
    resolver: string,
  ): Promise<DnsResult> {
    const fixture = this.fixtures.find(
      (f) => f.domain === domain && f.recordType === recordType,
    );

    if (!fixture) {
      return {
        resolver,
        recordType,
        answers: [],
        durationMs: 1,
        error: `No mock fixture for ${domain} ${recordType}`,
      };
    }

    if (fixture.error) {
      return {
        resolver,
        recordType,
        answers: [],
        durationMs: 1,
        error: fixture.error,
      };
    }

    return {
      resolver,
      recordType,
      answers: [...fixture.answers],
      durationMs: 1,
    };
  }
}
