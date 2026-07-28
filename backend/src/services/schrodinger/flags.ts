import type { PortProfile, ScanMode, VantageId } from '../../types/schrodinger.js';
import type { DnsMode } from '../../types/schrodinger.js';

const ALL_VANTAGES: VantageId[] = ['dns', 'ua', 'netweb', 'time'];

function parseList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export interface SchrodingerFlags {
  scanMode: ScanMode;
  dnsMode: DnsMode;
  dohEnabled: boolean;
  portProfile: PortProfile;
  enabledVantages: VantageId[];
  dnsSampleSize: number;
  dnsConcurrency: number;
  dnsTimeoutMs: number;
  dnsRetries: number;
  allowlist: string[];
  allowAllDomains: boolean;
  uaPaths: string[];
  rulesPath: string | null;
}

export function loadSchrodingerFlags(arsenalRoot: string): SchrodingerFlags {
  const scanModeRaw = (process.env.SCHRODINGER_SCAN_MODE ?? 'live').toLowerCase();
  const scanMode: ScanMode = scanModeRaw === 'mock' ? 'mock' : 'live';

  const dnsModeRaw = (process.env.SCHRODINGER_DNS_MODE ?? 'auto').toLowerCase();
  const dnsMode: DnsMode =
    dnsModeRaw === 'dig' || dnsModeRaw === 'mock' || dnsModeRaw === 'auto'
      ? dnsModeRaw
      : 'auto';

  const vantagesRaw = parseList(process.env.SCHRODINGER_VANTAGES);
  const enabledVantages =
    vantagesRaw.length === 0
      ? [...ALL_VANTAGES]
      : (vantagesRaw.filter((v) => ALL_VANTAGES.includes(v as VantageId)) as VantageId[]);

  const profileRaw = (process.env.SCHRODINGER_PORT_PROFILE ?? 'quick').toLowerCase();
  const portProfile: PortProfile = profileRaw === 'web' ? 'web' : 'quick';

  // Canonical: SCHRODINGER_ALLOWLIST; alias: SCHRODINGER_TARGET_ALLOWLIST (P0 docs)
  const allowRaw =
    process.env.SCHRODINGER_ALLOWLIST ??
    process.env.SCHRODINGER_TARGET_ALLOWLIST ??
    '*';
  const allowAllDomains = allowRaw.trim() === '*';
  const allowlist = allowAllDomains
    ? []
    : parseList(allowRaw).map((d) => d.replace(/^\*\./, ''));

  const uaPathsRaw = process.env.SCHRODINGER_UA_PATHS;
  const uaPaths = uaPathsRaw
    ? parseList(uaPathsRaw).map((p) => (p.startsWith('/') ? p : `/${p}`))
    : ['/', '/robots.txt', '/wp-admin', '/.well-known/security.txt'];

  return {
    scanMode,
    dnsMode: scanMode === 'mock' ? 'mock' : dnsMode,
    dohEnabled: process.env.SCHRODINGER_DOH === '1' || process.env.SCHRODINGER_DOH === 'true',
    portProfile,
    enabledVantages: enabledVantages.length > 0 ? enabledVantages : [...ALL_VANTAGES],
    dnsSampleSize: clampInt(process.env.SCHRODINGER_DNS_SAMPLE, 30, 1, 100),
    dnsConcurrency: clampInt(process.env.SCHRODINGER_DNS_CONCURRENCY, 6, 1, 32),
    dnsTimeoutMs: clampInt(process.env.SCHRODINGER_DNS_TIMEOUT_MS, 2500, 500, 15000),
    dnsRetries: clampInt(process.env.SCHRODINGER_DNS_RETRIES, 1, 0, 3),
    allowlist,
    allowAllDomains,
    uaPaths,
    rulesPath: process.env.SCHRODINGER_RULES_PATH ?? null,
  };
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function isVantageEnabled(flags: SchrodingerFlags, id: VantageId): boolean {
  return flags.enabledVantages.includes(id);
}
