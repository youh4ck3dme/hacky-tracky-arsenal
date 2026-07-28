import type { SchrodingerFlags } from './flags.js';

const TARGET_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export class AllowlistDeniedError extends Error {
  constructor(target: string) {
    super(
      `Allowlist deny: ${target} nie je v SCHRODINGER_ALLOWLIST. Pridaj doménu alebo nastav * pre lab.`,
    );
    this.name = 'AllowlistDeniedError';
  }
}

export function normalizeTarget(target: string): string {
  const trimmed = target.trim().toLowerCase().replace(/\.$/, '');
  if (!TARGET_REGEX.test(trimmed)) {
    throw new Error('Invalid domain. Use format: example.com');
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(trimmed)) {
    throw new Error('IP addresses not supported — use a domain name');
  }
  if (trimmed.includes(':')) {
    throw new Error('IPv6 literals not supported — use a domain name');
  }
  return trimmed;
}

/** Host matches allowlist entry exactly or as subdomain of entry. */
function hostAllowed(host: string, entry: string): boolean {
  if (host === entry) return true;
  return host.endsWith(`.${entry}`);
}

export function assertAllowlisted(target: string, flags: SchrodingerFlags): void {
  if (flags.allowAllDomains) return;
  if (flags.allowlist.length === 0) {
    throw new AllowlistDeniedError(target);
  }
  const ok = flags.allowlist.some((entry) => hostAllowed(target, entry));
  if (!ok) throw new AllowlistDeniedError(target);
}

export function validateAndAuthorizeTarget(
  raw: string,
  flags: SchrodingerFlags,
): string {
  const target = normalizeTarget(raw);
  assertAllowlisted(target, flags);
  return target;
}
