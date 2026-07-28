/**
 * Schrödinger platform barrel (`src/schrodinger/`).
 * Runtime scan engine lives in `src/services/schrodinger/` — see docs/SCHRODINGER-PACKAGE-LAYOUT.md.
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

// SSRF (pre-scan / resolved IP policy)
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

// DNS providers (P0 interface + stubs; production multi-record = services/schrodinger/dns)
export type { DnsProvider, DnsRecordType, DnsResult } from './dnsProvider.js';
export { DigDnsProvider } from './digDnsProvider.js';
export { MockDnsProvider } from './mockDnsProvider.js';

// P2/P3 add-ons (feature-flagged at call sites)
export { getToolSuggestion } from './toolBridge.js';
export type { ToolSuggestion } from './toolBridge.js';
