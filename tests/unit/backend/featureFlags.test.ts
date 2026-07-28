import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { isEnabled, getAllFlags } from '../../../backend/src/schrodinger/featureFlags.js';

describe('featureFlags', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    delete process.env.FEATURE_schrodinger_guardrails;
    delete process.env.FEATURE_schrodinger_persist_postgres;
    delete process.env.FEATURE_schrodinger_v2_providers;
  });

  describe('defaults', () => {
    it('schrodinger.guardrails defaults to true', () => {
      delete process.env.FEATURE_schrodinger_guardrails;
      expect(isEnabled('schrodinger.guardrails')).toBe(true);
    });

    it('schrodinger.persist.postgres defaults to false', () => {
      delete process.env.FEATURE_schrodinger_persist_postgres;
      expect(isEnabled('schrodinger.persist.postgres')).toBe(false);
    });

    it('schrodinger.v2_providers defaults to true (P1 Dig/Mock shipped)', () => {
      delete process.env.FEATURE_schrodinger_v2_providers;
      expect(isEnabled('schrodinger.v2_providers')).toBe(true);
    });
  });

  describe('env overrides', () => {
    it('accepts true', () => {
      process.env.FEATURE_schrodinger_persist_postgres = 'true';
      expect(isEnabled('schrodinger.persist.postgres')).toBe(true);
    });

    it('accepts 1', () => {
      process.env.FEATURE_schrodinger_persist_postgres = '1';
      expect(isEnabled('schrodinger.persist.postgres')).toBe(true);
    });

    it('accepts yes', () => {
      process.env.FEATURE_schrodinger_persist_postgres = 'yes';
      expect(isEnabled('schrodinger.persist.postgres')).toBe(true);
    });

    it('treats other values as false', () => {
      process.env.FEATURE_schrodinger_guardrails = 'false';
      expect(isEnabled('schrodinger.guardrails')).toBe(false);
    });

    it('treats empty string as false', () => {
      process.env.FEATURE_schrodinger_guardrails = '';
      expect(isEnabled('schrodinger.guardrails')).toBe(false);
    });
  });

  describe('getAllFlags', () => {
    it('returns all flags with resolved values', () => {
      const flags = getAllFlags();
      expect(flags).toHaveProperty('schrodinger.guardrails');
      expect(flags).toHaveProperty('schrodinger.persist.postgres');
      expect(flags).toHaveProperty('schrodinger.v2_providers');
      expect(typeof flags['schrodinger.guardrails']).toBe('boolean');
    });
  });
});
