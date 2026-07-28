import { describe, expect, it } from 'vitest';
import { MockDnsProvider } from '../../../backend/src/schrodinger/mockDnsProvider.js';

describe('MockDnsProvider', () => {
  it('resolves example.com to public IP', async () => {
    const provider = new MockDnsProvider();
    const result = await provider.resolve('example.com', 'A', '8.8.8.8');

    expect(result.answers).toContain('93.184.216.34');
    expect(result.error).toBeUndefined();
    expect(result.durationMs).toBeLessThan(100);
  });

  it('resolves internal.test to private IP (for SSRF testing)', async () => {
    const provider = new MockDnsProvider();
    const result = await provider.resolve('internal.test', 'A', '8.8.8.8');

    expect(result.answers).toContain('10.0.0.1');
  });

  it('resolves metadata.test to 169.254.169.254', async () => {
    const provider = new MockDnsProvider();
    const result = await provider.resolve('metadata.test', 'A', '8.8.8.8');

    expect(result.answers).toContain('169.254.169.254');
  });

  it('returns error for timeout.test', async () => {
    const provider = new MockDnsProvider();
    const result = await provider.resolve('timeout.test', 'A', '8.8.8.8');

    expect(result.answers).toHaveLength(0);
    expect(result.error).toBe('SERVFAIL');
  });

  it('returns empty for unknown domain', async () => {
    const provider = new MockDnsProvider();
    const result = await provider.resolve('unknown.domain', 'A', '8.8.8.8');

    expect(result.answers).toHaveLength(0);
    expect(result.error).toContain('No mock fixture');
  });

  it('addFixture overrides existing', async () => {
    const provider = new MockDnsProvider();
    provider.addFixture({
      domain: 'example.com',
      recordType: 'A',
      answers: ['1.2.3.4'],
    });

    const result = await provider.resolve('example.com', 'A', '8.8.8.8');
    expect(result.answers).toEqual(['1.2.3.4']);
  });

  it('supports custom fixtures', async () => {
    const provider = new MockDnsProvider([
      { domain: 'my.test', recordType: 'A', answers: ['5.5.5.5'] },
    ]);

    const result = await provider.resolve('my.test', 'A', '1.1.1.1');
    expect(result.answers).toEqual(['5.5.5.5']);
  });

  it('returns immutable answer copies', async () => {
    const provider = new MockDnsProvider();
    const r1 = await provider.resolve('example.com', 'A', '8.8.8.8');
    const r2 = await provider.resolve('example.com', 'A', '1.1.1.1');

    // Mutating r1 should not affect r2
    r1.answers.push('hacked');
    expect(r2.answers).not.toContain('hacked');
  });
});
