import { describe, expect, it } from 'vitest';
import { probeNetWeb } from '../../../backend/src/services/schrodinger/probes/netweb.js';
import { probeUserAgents } from '../../../backend/src/services/schrodinger/probes/userAgent.js';
import { assertSafeConnectTargets, isBlockedIp } from '../../../backend/src/services/schrodinger/ssrf.js';

describe('SSRF guardrails', () => {
  it('blocks private and metadata ranges', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('10.0.0.5')).toBe(true);
    expect(isBlockedIp('192.168.1.1')).toBe(true);
    expect(isBlockedIp('169.254.169.254')).toBe(true);
    expect(isBlockedIp('172.16.0.1')).toBe(true);
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('93.184.216.34')).toBe(false);
  });

  it('assertSafeConnectTargets throws when only private IPs', () => {
    expect(() => assertSafeConnectTargets(['127.0.0.1', '10.0.0.1'])).toThrow(/SSRF/);
  });

  it('assertSafeConnectTargets keeps public IPs', () => {
    expect(assertSafeConnectTargets(['10.0.0.1', '1.1.1.1'])).toEqual(['1.1.1.1']);
  });
});

describe('User-Agent matrix (mock)', () => {
  it('probes configured paths and clients', async () => {
    const result = await probeUserAgents('example.com', {
      paths: ['/', '/robots.txt', '/wp-admin', '/.well-known/security.txt'],
      mock: true,
    });
    expect(result.id).toBe('ua');
    expect(result.name).toMatch(/User-Agent HTTP \(5\)/);
    expect(result.findings.length).toBeGreaterThan(5);
    // no raw cookie values in details
    for (const f of result.findings) {
      expect(f.detail.toLowerCase()).not.toMatch(/set-cookie:/);
    }
  });

  it('detects quantum divergence for quantum.example.com', async () => {
    const result = await probeUserAgents('quantum.example.com', {
      paths: ['/'],
      mock: true,
    });
    expect(result.findings.some((f) => f.id === 'ua-quantum-diff')).toBe(true);
    expect(result.findings.some((f) => f.state === 'quantum')).toBe(true);
  });
});

describe('NetWeb probe (mock)', () => {
  it('quick profile does not scan full port range', async () => {
    const result = await probeNetWeb('example.com', {
      profile: 'quick',
      mock: true,
      resolvedIps: ['93.184.216.34'],
    });
    const portFindings = result.findings.filter((f) => f.id.startsWith('net-port-'));
    expect(portFindings.length).toBeLessThanOrEqual(8);
    expect(portFindings.length).toBeGreaterThan(0);
    expect(result.name).toContain('quick');
  });

  it('open-no-http target is quantum', async () => {
    const result = await probeNetWeb('open-no-http.example.com', {
      profile: 'quick',
      mock: true,
      resolvedIps: ['93.184.216.34'],
    });
    expect(result.findings.some((f) => f.id === 'netweb-quantum-port-http')).toBe(true);
  });

  it('http-filtered target is quantum', async () => {
    const result = await probeNetWeb('http-filtered.example.com', {
      profile: 'quick',
      mock: true,
      resolvedIps: [],
    });
    expect(result.findings.some((f) => f.id === 'netweb-quantum-http-port')).toBe(true);
  });
});
