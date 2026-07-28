import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { computeConsistencyScore, isSplitHorizon } from '../../../backend/src/services/schrodinger/dns/consistency.js';
import { MockDnsProvider } from '../../../backend/src/services/schrodinger/dns/mockProvider.js';
import type { ResolverAnswer } from '../../../backend/src/services/schrodinger/dns/types.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const resolversPath = path.join(root, 'tests/fixtures/h4ck-stub/resolvers/resolvers.txt');

describe('DNS consistency score', () => {
  it('scores perfect agreement high', () => {
    const answers: ResolverAnswer[] = [
      { resolver: '1.1.1.1', ok: true, aRecords: ['1.2.3.4'], records: [] },
      { resolver: '8.8.8.8', ok: true, aRecords: ['1.2.3.4'], records: [] },
      { resolver: '9.9.9.9', ok: true, aRecords: ['1.2.3.4'], records: [] },
    ];
    const { score, uniqueASets } = computeConsistencyScore(answers, 3);
    expect(uniqueASets).toBe(1);
    expect(score).toBeGreaterThanOrEqual(90);
    expect(isSplitHorizon(uniqueASets, 3)).toBe(false);
  });

  it('detects split-horizon and lowers score', () => {
    const answers: ResolverAnswer[] = [
      { resolver: '1.1.1.1', ok: true, aRecords: ['1.2.3.4'], records: [] },
      { resolver: '8.8.8.8', ok: true, aRecords: ['9.9.9.9'], records: [] },
    ];
    const { score, uniqueASets } = computeConsistencyScore(answers, 2);
    expect(uniqueASets).toBe(2);
    expect(isSplitHorizon(uniqueASets, 2)).toBe(true);
    expect(score).toBeLessThan(70);
  });
});

describe('MockDnsProvider', () => {
  const provider = new MockDnsProvider();
  const opts = {
    sampleSize: 3,
    concurrency: 3,
    timeoutMs: 100,
    retries: 0,
    resolversPath,
  };

  it('returns consistent multi-record for example.com', async () => {
    const out = await provider.scan('example.com', opts);
    expect(out.provider).toBe('mock');
    expect(out.vantage.meta?.consistencyScore).toBeGreaterThanOrEqual(70);
    expect(out.vantage.findings.some((f) => f.id === 'dns-quantum-split')).toBe(false);
    expect(out.vantage.findings.some((f) => f.id === 'dns-multi-records')).toBe(true);
    expect(out.resolvedIps.length).toBeGreaterThan(0);
  });

  it('flags split-horizon for quantum.example.com', async () => {
    const out = await provider.scan('quantum.example.com', opts);
    expect(out.vantage.findings.some((f) => f.id === 'dns-quantum-split')).toBe(true);
    expect(out.vantage.findings.some((f) => f.state === 'quantum')).toBe(true);
    expect(Number(out.vantage.meta?.uniqueASets)).toBeGreaterThanOrEqual(2);
  });

  it('silent target yields absent answers', async () => {
    const out = await provider.scan('silent.example.com', opts);
    expect(out.resolvedIps.length).toBe(0);
    expect(out.vantage.meta?.successCount).toBe(0);
  });
});
