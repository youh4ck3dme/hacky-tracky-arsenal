import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const arsenalRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(arsenalRoot, '.env') });

function resolveH4ckRoot(): string {
  const fromEnv = process.env.H4CK_ROOT;
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.resolve(arsenalRoot, '..');
}

export const config = {
  port: Number(process.env.PORT ?? 3847),
  host: process.env.HOST ?? '127.0.0.1',
  /** Machine / API bearer token (optional advanced). */
  apiToken: process.env.ARSENAL_API_TOKEN ?? 'dev-token-change-me',
  /**
   * Simple panel password shown in the UI login form.
   * Accepted as Bearer the same way as `apiToken`.
   */
  panelPassword: process.env.ARSENAL_PANEL_PASSWORD ?? '23513900',
  h4ckRoot: resolveH4ckRoot(),
  arsenalRoot,
  registryPath: path.resolve(arsenalRoot, 'shared/arsenal-registry.json'),
  jobsDataPath: path.resolve(__dirname, '../data/jobs.json'),
  /** Schrödinger scan persistence (P0 adapter). */
  scansDataPath: path.resolve(__dirname, '../data/schrodinger-scans.json'),
  maxLogLines: 5000,
  version: '1.1.0',

  /** Schrödinger Observation Platform P0 config. */
  schrodinger: {
    /** Max parallel scans. */
    maxConcurrent: Number(process.env.SCHRODINGER_MAX_CONCURRENT ?? 3),
    /**
     * Target allowlist — comma-separated domains or globs.
     * Canonical env: SCHRODINGER_ALLOWLIST (alias: SCHRODINGER_TARGET_ALLOWLIST).
     * `*` = allow all (default). Example: `*.example.com,test.org`
     */
    targetAllowlist:
      process.env.SCHRODINGER_ALLOWLIST ??
      process.env.SCHRODINGER_TARGET_ALLOWLIST ??
      '*',
    /** Path to JSON file for optional disk persistence. Empty = in-memory only. */
    storeFile: process.env.SCHRODINGER_STORE_FILE ?? '',
    /** Max audit log entries in ring buffer. */
    auditLogSize: Number(process.env.SCHRODINGER_AUDIT_LOG_SIZE ?? 1000),
  },
};

/** True if the bearer secret matches the API token or panel password. */
export function isValidCredential(secret: string): boolean {
  if (!secret) return false;
  return secret === config.apiToken || secret === config.panelPassword;
}

export function validateH4ckRoot(): void {
  const marker = path.join(config.h4ckRoot, 'hacky-admin-menu.sh');
  if (!fs.existsSync(marker)) {
    throw new Error(
      `Invalid H4CK_ROOT (${config.h4ckRoot}): hacky-admin-menu.sh not found`,
    );
  }
}
