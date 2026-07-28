/**
 * Schrödinger P0 — Dig DNS Provider
 *
 * Wraps the system `dig` command to perform DNS resolution. This is a stub
 * that implements the DnsProvider interface — currently supports A records
 * (matching the existing scanner behavior). Full multi-record support in P1.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { DnsProvider, DnsRecordType, DnsResult } from './dnsProvider.js';

const execFileAsync = promisify(execFile);

export class DigDnsProvider implements DnsProvider {
  readonly name = 'dig';

  async resolve(
    domain: string,
    recordType: DnsRecordType,
    resolver: string,
  ): Promise<DnsResult> {
    const start = performance.now();
    try {
      const { stdout } = await execFileAsync('dig', [
        `@${resolver}`, domain, recordType, '+short', '+time=2', '+tries=1',
      ], { timeout: 3000 });

      const answers = stdout
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      return {
        resolver,
        recordType,
        answers,
        durationMs: Math.round(performance.now() - start),
      };
    } catch (err) {
      return {
        resolver,
        recordType,
        answers: [],
        durationMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : 'dig failed',
      };
    }
  }
}
