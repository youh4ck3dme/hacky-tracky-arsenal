/**
 * Schrödinger P0 — SSRF Validator
 *
 * Pure functions to block Server-Side Request Forgery via DNS rebinding or
 * direct internal IP targeting. Validates resolved IPs against RFC1918,
 * link-local, loopback, and cloud metadata ranges.
 *
 * This is the security-critical path — every IP that the scanner would connect
 * to MUST pass through validateResolvedIps() when guardrails are enabled.
 */

/** CIDR-style blocked ranges. */
interface BlockedRange {
  readonly label: string;
  readonly check: (ip: string) => boolean;
}

/**
 * Parse an IPv4 address to a 32-bit number.
 * Returns null for invalid addresses.
 */
function ipv4ToNum(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    num = (num << 8) | octet;
  }
  // Convert to unsigned 32-bit
  return num >>> 0;
}

/** Check if an IPv4 address is in a CIDR range. */
function inCidr(ip: string, network: string, prefixLen: number): boolean {
  const ipNum = ipv4ToNum(ip);
  const netNum = ipv4ToNum(network);
  if (ipNum === null || netNum === null) return false;
  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
  return (ipNum & mask) === (netNum & mask);
}

const BLOCKED_RANGES: readonly BlockedRange[] = [
  // RFC1918 private ranges
  { label: 'RFC1918 10/8', check: (ip) => inCidr(ip, '10.0.0.0', 8) },
  { label: 'RFC1918 172.16/12', check: (ip) => inCidr(ip, '172.16.0.0', 12) },
  { label: 'RFC1918 192.168/16', check: (ip) => inCidr(ip, '192.168.0.0', 16) },

  // Loopback
  { label: 'Loopback 127/8', check: (ip) => inCidr(ip, '127.0.0.0', 8) },

  // Link-local (includes AWS/GCP/Azure metadata at 169.254.169.254)
  { label: 'Link-local 169.254/16', check: (ip) => inCidr(ip, '169.254.0.0', 16) },

  // IPv6 mapped/compat as IPv4 string representations
  { label: 'IPv6 loopback', check: (ip) => ip === '::1' || ip === '0:0:0:0:0:0:0:1' },

  // IPv6 unique-local fc00::/7
  {
    label: 'IPv6 unique-local',
    check: (ip) => /^f[cd][0-9a-f]{2}:/i.test(ip),
  },

  // IPv6 link-local fe80::/10
  {
    label: 'IPv6 link-local',
    check: (ip) => /^fe[89ab][0-9a-f]:/i.test(ip),
  },

  // Explicit cloud metadata IPs
  {
    label: 'Cloud metadata',
    check: (ip) => ip === '169.254.169.254' || ip === 'fd00::1' || ip === '100.100.100.200',
  },

  // Documentation ranges (RFC5737)
  { label: 'RFC5737 TEST-NET-1', check: (ip) => inCidr(ip, '192.0.2.0', 24) },
  { label: 'RFC5737 TEST-NET-2', check: (ip) => inCidr(ip, '198.51.100.0', 24) },
  { label: 'RFC5737 TEST-NET-3', check: (ip) => inCidr(ip, '203.0.113.0', 24) },

  // Broadcast
  { label: 'Broadcast', check: (ip) => ip === '255.255.255.255' },

  // Zero
  { label: 'Zero address', check: (ip) => ip === '0.0.0.0' },
] as const;

export interface SsrfCheckResult {
  blocked: boolean;
  ip: string;
  reason?: string;
}

/**
 * Check a single IP against all blocked ranges.
 * Returns the match result with the reason if blocked.
 */
export function isBlockedIp(ip: string): SsrfCheckResult {
  const trimmed = ip.trim();
  for (const range of BLOCKED_RANGES) {
    if (range.check(trimmed)) {
      return { blocked: true, ip: trimmed, reason: range.label };
    }
  }
  return { blocked: false, ip: trimmed };
}

/**
 * Validate a batch of resolved IPs. Throws if ANY IP is in a blocked range.
 * This is the primary guard called before any outbound connection.
 */
export function validateResolvedIps(ips: string[]): void {
  for (const ip of ips) {
    const result = isBlockedIp(ip);
    if (result.blocked) {
      throw new SsrfBlockedError(result.ip, result.reason!);
    }
  }
}

/** Typed error for SSRF blocks — allows callers to distinguish from other errors. */
export class SsrfBlockedError extends Error {
  public readonly code = 'SSRF_BLOCKED' as const;
  constructor(
    public readonly ip: string,
    public readonly reason: string,
  ) {
    super(`SSRF blocked: ${ip} (${reason})`);
    this.name = 'SsrfBlockedError';
  }
}
