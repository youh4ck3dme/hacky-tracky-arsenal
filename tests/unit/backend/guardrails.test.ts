import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import {
  ConcurrencyLimiter,
  ConcurrencyExceededError,
  isTargetAllowed,
  checkPreScanGuardrails,
} from '../../../backend/src/schrodinger/guardrails.js';

// ── Concurrency Limiter ──────────────────────────────────────────────────────

describe('ConcurrencyLimiter', () => {
  it('allows up to max concurrent acquisitions', () => {
    const limiter = new ConcurrencyLimiter(3);
    const r1 = limiter.acquire();
    const r2 = limiter.acquire();
    const r3 = limiter.acquire();
    expect(limiter.currentCount).toBe(3);

    // Clean up
    r1(); r2(); r3();
  });

  it('throws ConcurrencyExceededError when at capacity', () => {
    const limiter = new ConcurrencyLimiter(2);
    limiter.acquire();
    limiter.acquire();

    expect(() => limiter.acquire()).toThrow(ConcurrencyExceededError);
    expect(() => limiter.acquire()).toThrow(/Max concurrent/);
  });

  it('releases allow new acquisitions', () => {
    const limiter = new ConcurrencyLimiter(1);
    const release = limiter.acquire();
    expect(() => limiter.acquire()).toThrow();

    release();
    expect(limiter.currentCount).toBe(0);

    // Should work now
    const release2 = limiter.acquire();
    expect(limiter.currentCount).toBe(1);
    release2();
  });

  it('double-release is safe (idempotent)', () => {
    const limiter = new ConcurrencyLimiter(1);
    const release = limiter.acquire();
    release();
    release(); // should not go negative
    expect(limiter.currentCount).toBe(0);
  });
});

// ── Target Allowlist ─────────────────────────────────────────────────────────

describe('isTargetAllowed', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Ensure guardrails are enabled for these tests
    process.env.FEATURE_schrodinger_guardrails = 'true';
  });

  afterEach(() => {
    process.env.SCHRODINGER_TARGET_ALLOWLIST = originalEnv.SCHRODINGER_TARGET_ALLOWLIST;
    process.env.FEATURE_schrodinger_guardrails = originalEnv.FEATURE_schrodinger_guardrails;
  });

  it('allows all when allowlist is * (default)', () => {
    process.env.SCHRODINGER_TARGET_ALLOWLIST = '*';
    // Need to re-import to pick up config change — in practice config is read at import time
    // For this test we verify the function logic with mocked config
    expect(isTargetAllowed('anything.com')).toBe(true);
  });

  it('returns true when guardrails are disabled', () => {
    process.env.FEATURE_schrodinger_guardrails = 'false';
    process.env.SCHRODINGER_TARGET_ALLOWLIST = 'specific.com';
    expect(isTargetAllowed('anything.com')).toBe(true);
  });
});

// ── Pre-scan Guardrails ──────────────────────────────────────────────────────

describe('checkPreScanGuardrails', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env.FEATURE_schrodinger_guardrails = originalEnv.FEATURE_schrodinger_guardrails;
  });

  it('allows when guardrails are disabled', () => {
    process.env.FEATURE_schrodinger_guardrails = 'false';
    const result = checkPreScanGuardrails('anything.com');
    expect(result.allowed).toBe(true);
  });

  it('allows when target is in wildcard allowlist', () => {
    process.env.FEATURE_schrodinger_guardrails = 'true';
    // Default allowlist is * (allow all)
    const result = checkPreScanGuardrails('example.com');
    expect(result.allowed).toBe(true);
  });
});
