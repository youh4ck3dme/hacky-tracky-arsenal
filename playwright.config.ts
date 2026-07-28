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
/** Dedicated e2e backend port so SCHRODINGER_SCAN_MODE=mock is not skipped by a live lab :3847. */
const E2E_API_PORT = process.env.E2E_API_PORT ?? '3848';
const E2E_API = `http://127.0.0.1:${E2E_API_PORT}`;


/** Thin flagship profile for integrity / hit-target tests. */
const IPHONE_17_AIR = {
  viewport: { width: 420, height: 912 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1 ArsenalIntegrity/iPhone17Air',
};

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
    {
      name: 'chromium',
      // Desktop product E2E (not phone integrity / not dedicated PWA-stability stress)
      testIgnore: [
        '**/iphone-17-air-integrity.spec.ts',
        '**/pwa.spec.ts',
        '**/stability.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'pwa',
      testMatch: '**/pwa.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // PWA needs SW
        serviceWorkers: 'allow',
      },
    },
    {
      name: 'stability',
      testMatch: '**/stability.spec.ts',
      timeout: 90_000,
      use: {
        ...devices['Desktop Chrome'],
        serviceWorkers: 'allow',
      },
    },
    {
      name: 'iphone-17-air',
      testMatch: '**/iphone-17-air-integrity.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        ...IPHONE_17_AIR,
        browserName: 'chromium',
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter arsenal-backend dev',
      url: `${E2E_API}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...process.env,
        PORT: E2E_API_PORT,
        HOST: '127.0.0.1',
        ARSENAL_API_TOKEN: process.env.ARSENAL_API_TOKEN ?? 'dev-token-change-me',
        ARSENAL_PANEL_PASSWORD: process.env.ARSENAL_PANEL_PASSWORD ?? '23513900',
        H4CK_ROOT: process.env.H4CK_ROOT ?? `${process.cwd()}/tests/fixtures/h4ck-stub`,
        // Mock path keeps browser E2E under a few seconds and deterministic.
        SCHRODINGER_SCAN_MODE: process.env.SCHRODINGER_SCAN_MODE ?? 'mock',
        SCHRODINGER_DNS_MODE: process.env.SCHRODINGER_DNS_MODE ?? 'mock',
        SCHRODINGER_ALLOWLIST: process.env.SCHRODINGER_ALLOWLIST ?? '*',
      },
    },
    {
      command: 'pnpm --filter arsenal-frontend dev',
      url: FRONTEND_URL,
      // Must start fresh so ARSENAL_API_PROXY points at the mock e2e backend.
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...process.env,
        ARSENAL_API_PROXY: E2E_API,
      },
    },
  ],
});


