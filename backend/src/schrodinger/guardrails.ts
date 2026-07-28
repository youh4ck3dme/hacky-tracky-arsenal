/**
 * Schrödinger P0 — Guardrails
 *
 * Three layers of protection:
 * 1. Target Allowlist — only scan approved domains
 * 2. SSRF Validation — block internal IPs after DNS resolve
 * 3. Concurrency Limiter — cap parallel scans
 *
 * All checks are gated behind the `schrodinger.guardrails` feature flag.
 * When the flag is off, all checks pass (MVP behavior).
 */

import { config } from '../config.js';
import type { AuditAction } from './domain.js';
import { isEnabled } from './featureFlags.js';
import { SsrfBlockedError, validateResolvedIps } from './ssrf.js';

// ─── Target Allowlist ────────────────────────────────────────────────────────

/**
 * Parse the allowlist config into a list of matchers.
 * Format: comma-separated, supports `*` (all) and `*.example.com` (suffix).
 */
function parseAllowlist(raw: string): Array<(domain: string) => boolean> {
  const entries = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (entries.length === 0 || entries.includes('*')) {
    return [() => true]; // wildcard = allow all
  }
  return entries.map((pattern) => {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1); // ".example.com"
      return (domain: string) => domain === pattern.slice(2) || domain.endsWith(suffix);
    }
    return (domain: string) => domain === pattern;
  });
}

/**
 * Check if a target domain is allowed by the configured allowlist.
 * Returns `true` if allowed, `false` if blocked.
 */
export function isTargetAllowed(domain: string): boolean {
  if (!isEnabled('schrodinger.guardrails')) return true;

  const matchers = parseAllowlist(config.schrodinger.targetAllowlist);
  return matchers.some((match) => match(domain.toLowerCase()));
}

// ─── SSRF Guard ──────────────────────────────────────────────────────────────

/**
 * Validate resolved IPs against SSRF blocklist.
 * Throws SsrfBlockedError if any IP is internal/metadata.
 * No-op when guardrails are disabled.
 */
export function guardSsrf(ips: string[]): void {
  if (!isEnabled('schrodinger.guardrails')) return;
  validateResolvedIps(ips);
}

// ─── Concurrency Limiter ─────────────────────────────────────────────────────

/**
 * Simple semaphore for bounding concurrent scans.
 * acquire() returns a release function; throws if at capacity.
 */
export class ConcurrencyLimiter {
  private active = 0;

  constructor(private readonly maxConcurrent: number) {}

  get currentCount(): number {
    return this.active;
  }

  get limit(): number {
    return this.maxConcurrent;
  }

  /**
   * Acquire a slot. Returns a release function.
   * Throws ConcurrencyExceededError if at capacity.
   */
  acquire(): () => void {
    if (this.active >= this.maxConcurrent) {
      throw new ConcurrencyExceededError(this.maxConcurrent);
    }
    this.active++;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.active--;
      }
    };
  }
}

export class ConcurrencyExceededError extends Error {
  public readonly code = 'CONCURRENCY_EXCEEDED' as const;
  constructor(public readonly limit: number) {
    super(`Max concurrent scans (${limit}) exceeded. Try again later.`);
    this.name = 'ConcurrencyExceededError';
  }
}

// ─── Barrel: validate all guardrails before scan ─────────────────────────────

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  auditAction?: AuditAction;
}

/**
 * Run all pre-scan guardrail checks. Call before creating a scan.
 * Does NOT check SSRF (that happens after DNS resolve, during scan execution).
 */
export function checkPreScanGuardrails(domain: string): GuardrailResult {
  if (!isEnabled('schrodinger.guardrails')) {
    return { allowed: true };
  }

  if (!isTargetAllowed(domain)) {
    return {
      allowed: false,
      reason: `Target "${domain}" is not in the allowlist`,
      auditAction: 'target.blocked',
    };
  }

  return { allowed: true };
}

// Re-export for convenience
export { SsrfBlockedError };
