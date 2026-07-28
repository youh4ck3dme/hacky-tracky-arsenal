/**
 * Schrödinger P0 — Barrel Export
 *
 * Central export point for the schrodinger/ module.
 */

// Domain model
export type {
  AuditAction,
  AuditEvent,
  Target,
  VantageRun,
} from './domain.js';

// Feature flags
export { getAllFlags, isEnabled } from './featureFlags.js';
export type { FeatureFlagName } from './featureFlags.js';

// SSRF
export { isBlockedIp, SsrfBlockedError, validateResolvedIps } from './ssrf.js';

// Guardrails
export {
  checkPreScanGuardrails,
  ConcurrencyExceededError,
  ConcurrencyLimiter,
  guardSsrf,
  isTargetAllowed,
} from './guardrails.js';

// Audit log
export { AuditLog, getAuditLog, resetAuditLog } from './auditLog.js';

// Store
export type { ScanStore } from './store.js';
export { InMemoryStore } from './memoryStore.js';
export { FileJsonStore } from './fileStore.js';
export { PostgresStore } from './postgresStore.js';

// DNS providers
export type { DnsProvider, DnsRecordType, DnsResult } from './dnsProvider.js';
export { DigDnsProvider } from './digDnsProvider.js';
export { MockDnsProvider } from './mockDnsProvider.js';
