import { describe, expect, it } from 'vitest';
import { isBlockedIp, SsrfBlockedError, validateResolvedIps } from '../../../backend/src/schrodinger/ssrf.js';
import {
  isBlockedIpv4,
  isBlockedIpv6,
  assertSafeConnectTargets,
} from '../../../backend/src/services/schrodinger/ssrf.js';

// ── P0 SSRF module (backend/src/schrodinger/ssrf.ts) ───────────────────────

describe('isBlockedIp (P0 module)', () => {
  describe('RFC1918 private ranges', () => {
    it('blocks 10.0.0.0/8', () => {
      expect(isBlockedIp('10.0.0.1').blocked).toBe(true);
      expect(isBlockedIp('10.255.255.255').blocked).toBe(true);
    });

    it('blocks 172.16.0.0/12', () => {
      expect(isBlockedIp('172.16.0.1').blocked).toBe(true);
      expect(isBlockedIp('172.31.255.255').blocked).toBe(true);
    });

    it('blocks 192.168.0.0/16', () => {
      expect(isBlockedIp('192.168.0.1').blocked).toBe(true);
      expect(isBlockedIp('192.168.255.255').blocked).toBe(true);
    });
  });

  describe('loopback', () => {
    it('blocks 127.0.0.0/8', () => {
      expect(isBlockedIp('127.0.0.1').blocked).toBe(true);
      expect(isBlockedIp('127.255.255.255').blocked).toBe(true);
    });
  });

  describe('link-local and cloud metadata', () => {
    it('blocks 169.254.0.0/16', () => {
      expect(isBlockedIp('169.254.0.1').blocked).toBe(true);
    });

    it('blocks cloud metadata IP 169.254.169.254', () => {
      expect(isBlockedIp('169.254.169.254').blocked).toBe(true);
      expect(isBlockedIp('169.254.169.254').reason).toBeDefined();
    });
  });

  describe('IPv6 blocked ranges', () => {
    it('blocks ::1 (loopback)', () => {
      expect(isBlockedIp('::1').blocked).toBe(true);
    });

    it('blocks fe80:: (link-local)', () => {
      expect(isBlockedIp('fe80::1').blocked).toBe(true);
    });

    it('blocks fc00::/fd00:: (unique-local)', () => {
      expect(isBlockedIp('fc00::1').blocked).toBe(true);
      expect(isBlockedIp('fd12::1').blocked).toBe(true);
    });
  });

  describe('legitimate public IPs (should NOT be blocked)', () => {
    it('allows 93.184.216.34 (example.com)', () => {
      expect(isBlockedIp('93.184.216.34').blocked).toBe(false);
    });

    it('allows 8.8.8.8 (Google DNS)', () => {
      expect(isBlockedIp('8.8.8.8').blocked).toBe(false);
    });

    it('allows 1.1.1.1 (Cloudflare)', () => {
      expect(isBlockedIp('1.1.1.1').blocked).toBe(false);
    });

    it('allows 104.16.132.229 (Cloudflare)', () => {
      expect(isBlockedIp('104.16.132.229').blocked).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('blocks 0.0.0.0', () => {
      expect(isBlockedIp('0.0.0.0').blocked).toBe(true);
    });

    it('blocks 255.255.255.255 (broadcast)', () => {
      expect(isBlockedIp('255.255.255.255').blocked).toBe(true);
    });
  });
});

describe('validateResolvedIps', () => {
  it('passes for all-public IPs', () => {
    expect(() => validateResolvedIps(['93.184.216.34', '8.8.8.8'])).not.toThrow();
  });

  it('throws SsrfBlockedError for any private IP', () => {
    expect(() => validateResolvedIps(['93.184.216.34', '10.0.0.1']))
      .toThrow(SsrfBlockedError);
  });

  it('throws for metadata IP mixed with public', () => {
    expect(() => validateResolvedIps(['8.8.8.8', '169.254.169.254']))
      .toThrow(SsrfBlockedError);
  });

  it('passes for empty array', () => {
    expect(() => validateResolvedIps([])).not.toThrow();
  });
});

// ── Services SSRF module (backend/src/services/schrodinger/ssrf.ts) ─────────

describe('isBlockedIpv4 (services module)', () => {
  it('blocks all RFC1918 ranges', () => {
    expect(isBlockedIpv4('10.0.0.1')).toBe(true);
    expect(isBlockedIpv4('172.16.0.1')).toBe(true);
    expect(isBlockedIpv4('192.168.1.1')).toBe(true);
  });

  it('blocks loopback', () => {
    expect(isBlockedIpv4('127.0.0.1')).toBe(true);
  });

  it('blocks link-local/metadata', () => {
    expect(isBlockedIpv4('169.254.169.254')).toBe(true);
  });

  it('allows public IPs', () => {
    expect(isBlockedIpv4('93.184.216.34')).toBe(false);
    expect(isBlockedIpv4('8.8.8.8')).toBe(false);
  });

  it('blocks CGNAT range', () => {
    expect(isBlockedIpv4('100.64.0.1')).toBe(true);
  });
});

describe('isBlockedIpv6 (services module)', () => {
  it('blocks ::1', () => {
    expect(isBlockedIpv6('::1')).toBe(true);
  });

  it('blocks fe80:: link-local', () => {
    expect(isBlockedIpv6('fe80::1')).toBe(true);
  });

  it('blocks ULA fd00::', () => {
    expect(isBlockedIpv6('fd00::1')).toBe(true);
  });
});

describe('assertSafeConnectTargets', () => {
  it('returns only safe IPs', () => {
    const safe = assertSafeConnectTargets(['93.184.216.34', '10.0.0.1']);
    expect(safe).toEqual(['93.184.216.34']);
  });

  it('throws when all IPs are blocked', () => {
    expect(() => assertSafeConnectTargets(['10.0.0.1', '192.168.1.1']))
      .toThrow(/SSRF/);
  });

  it('throws on empty input', () => {
    expect(() => assertSafeConnectTargets([]))
      .toThrow(/SSRF/);
  });

  // Critical security test: metadata IP must NEVER pass
  it('CRITICAL: 169.254.169.254 is always blocked', () => {
    expect(() => assertSafeConnectTargets(['169.254.169.254']))
      .toThrow(/SSRF/);
  });
});
