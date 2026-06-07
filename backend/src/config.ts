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
  apiToken: process.env.ARSENAL_API_TOKEN ?? 'dev-token-change-me',
  h4ckRoot: resolveH4ckRoot(),
  arsenalRoot,
  registryPath: path.resolve(arsenalRoot, 'shared/arsenal-registry.json'),
  jobsDataPath: path.resolve(__dirname, '../data/jobs.json'),
  maxLogLines: 5000,
  version: '1.0.0',
};

export function validateH4ckRoot(): void {
  const marker = path.join(config.h4ckRoot, 'hacky-admin-menu.sh');
  if (!fs.existsSync(marker)) {
    throw new Error(
      `Invalid H4CK_ROOT (${config.h4ckRoot}): hacky-admin-menu.sh not found`,
    );
  }
}
