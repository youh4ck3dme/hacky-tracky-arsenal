/**
 * Schrödinger P0 — Feature Flags
 *
 * Simple, typed feature flag system. Defaults are safe (existing behavior).
 * Override via env: FEATURE_schrodinger_guardrails=false
 */

const DEFAULTS = {
  /** P0: Enable guardrails (SSRF, allowlist, concurrency). Default ON. */
  'schrodinger.guardrails': true,
  /** P1: Enable Postgres persistence. Default OFF — uses memory/file. */
  'schrodinger.persist.postgres': false,
  /**
   * P1: DigDnsProvider + MockDnsProvider multi-record stack (already shipped).
   * Default ON. Set false only for emergency rollback experiments.
   */
  'schrodinger.v2_providers': true,
  /** P2: Background target watching & push notifications. Default OFF. */
  'schrodinger.watch': false,
  /** P2: Tool Bridge — suggest Arsenal tools per finding. Default ON. */
  'schrodinger.tool_bridge': true,
  /** P3: Vertex AI Gemini triage integration. Default OFF. */
  'schrodinger.vertex_triage': false,
  /** P3: Multi-region egress probe. Default OFF. */
  'schrodinger.multi_region': false,
  /** P3: BigQuery telemetry sink. Default OFF. */
  'schrodinger.bigquery_sink': false,
} as const;

export type FeatureFlagName = keyof typeof DEFAULTS;

/**
 * Check if a feature flag is enabled.
 *
 * Resolution order:
 * 1. Environment variable `FEATURE_<flag_name_with_underscores>` (truthy = 'true'/'1'/'yes')
 * 2. Default value from DEFAULTS
 */
export function isEnabled(flag: FeatureFlagName): boolean {
  const envKey = `FEATURE_${flag.replace(/\./g, '_')}`;
  const envVal = process.env[envKey];
  if (envVal !== undefined) {
    return ['true', '1', 'yes'].includes(envVal.toLowerCase());
  }
  return DEFAULTS[flag];
}

/** Get all flags and their current resolved values. */
export function getAllFlags(): Record<FeatureFlagName, boolean> {
  const result = {} as Record<FeatureFlagName, boolean>;
  for (const flag of Object.keys(DEFAULTS) as FeatureFlagName[]) {
    result[flag] = isEnabled(flag);
  }
  return result;
}
