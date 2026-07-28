/**
 * SSRF guardrails — never connect to private / link-local / metadata ranges
 * even if DNS returns them after an allowlisted domain resolves.
 */

const BLOCKED_V4_CIDRS: Array<{ base: number; mask: number; label: string }> = [
  // 0.0.0.0/8
  { base: ip4('0.0.0.0'), mask: 8, label: 'this-network' },
  // 10.0.0.0/8
  { base: ip4('10.0.0.0'), mask: 8, label: 'rfc1918-10' },
  // 127.0.0.0/8
  { base: ip4('127.0.0.0'), mask: 8, label: 'loopback' },
  // 169.254.0.0/16 (link-local + cloud metadata)
  { base: ip4('169.254.0.0'), mask: 16, label: 'link-local' },
  // 172.16.0.0/12
  { base: ip4('172.16.0.0'), mask: 12, label: 'rfc1918-172' },
  // 192.168.0.0/16
  { base: ip4('192.168.0.0'), mask: 16, label: 'rfc1918-192' },
  // 100.64.0.0/10 CGNAT
  { base: ip4('100.64.0.0'), mask: 10, label: 'cgnat' },
  // 224.0.0.0/4 multicast
  { base: ip4('224.0.0.0'), mask: 4, label: 'multicast' },
  // 240.0.0.0/4 reserved
  { base: ip4('240.0.0.0'), mask: 4, label: 'reserved' },
];

function ip4(dotted: string): number {
  const parts = dotted.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function matchesCidr(ip: number, base: number, mask: number): boolean {
  if (mask === 0) return true;
  const m = mask === 32 ? 0xffffffff : (~0 << (32 - mask)) >>> 0;
  return (ip & m) === (base & m);
}

export function isBlockedIpv4(ip: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return true;
  const parts = ip.split('.').map(Number);
  if (parts.some((p) => p > 255)) return true;
  const n = ip4(ip);
  return BLOCKED_V4_CIDRS.some((c) => matchesCidr(n, c.base, c.mask));
}

/** Best-effort IPv6 block: loopback, ULA, link-local, IPv4-mapped private. */
export function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
  if (lower.startsWith('::ffff:')) {
    const v4 = lower.slice('::ffff:'.length);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return isBlockedIpv4(v4);
  }
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (!trimmed) return true;
  if (trimmed.includes(':')) return isBlockedIpv6(trimmed);
  return isBlockedIpv4(trimmed);
}

export class SsrfBlockedError extends Error {
  constructor(public readonly ip: string) {
    super(`SSRF block: resolvovaný IP ${ip} je v zakázanom rozsahu (súkromná/metadata sieť)`);
    this.name = 'SsrfBlockedError';
  }
}

/**
 * Re-check resolved addresses before any TCP/HTTP connect.
 * Throws if every address is blocked or the only candidates are blocked.
 */
export function assertSafeConnectTargets(ips: string[]): string[] {
  const safe = ips.filter((ip) => !isBlockedIp(ip));
  if (safe.length === 0 && ips.length > 0) {
    throw new SsrfBlockedError(ips[0]);
  }
  if (safe.length === 0) {
    throw new SsrfBlockedError('(žiadna IP)');
  }
  return safe;
}
