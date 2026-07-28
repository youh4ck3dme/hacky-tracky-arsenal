import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const setupDir = path.dirname(fileURLToPath(import.meta.url));
const arsenalRoot = path.resolve(setupDir, '../..');
const stubRoot = path.resolve(setupDir, '../fixtures/h4ck-stub');
const parentRoot = path.resolve(arsenalRoot, '..');

function resolveTestH4ckRoot(): string {
  const marker = 'hacky-admin-menu.sh';
  if (fs.existsSync(path.join(parentRoot, marker))) {
    return parentRoot;
  }
  return stubRoot;
}

process.env.ARSENAL_API_TOKEN ??= 'test-token';
process.env.ARSENAL_PANEL_PASSWORD ??= '23513900';
process.env.H4CK_ROOT ??= resolveTestH4ckRoot();
process.env.PORT ??= '0';
process.env.HOST ??= '127.0.0.1';
// Schrödinger P1 — deterministic fast path in unit/integration CI
process.env.SCHRODINGER_SCAN_MODE ??= 'mock';
process.env.SCHRODINGER_DNS_MODE ??= 'mock';
process.env.SCHRODINGER_ALLOWLIST ??= '*';
