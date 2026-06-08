import { defineConfig, devices } from '@playwright/test';

/**
 * Browser E2E for Arsenal PWA.
 *
 * Playwright boots the real backend + frontend dev servers (or reuses a running
 * instance) and drives the actual UI in Chromium: login → dashboard → Schrödinger
 * scan → Palimpsest timeline.
 *
 * Auth token defaults to the backend's own default (`dev-token-change-me`) so it
 * works out of the box; override with ARSENAL_API_TOKEN to match a custom `.env`.
 */
const FRONTEND_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter arsenal-backend dev',
      url: 'http://127.0.0.1:3847/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter arsenal-frontend dev',
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
