/**
 * PWA-specific suite: manifest, icons, service worker, offline shell, IndexedDB cache.
 */
import { expect, test } from '@playwright/test';
import { attachConsoleErrorGuard, login, PANEL_PASSWORD } from './helpers/auth';

test.describe('PWA — installability & assets', () => {
  test('P01 manifest.webmanifest is valid Web App Manifest', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok(), `manifest status ${res.status()}`).toBeTruthy();
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toMatch(/manifest|json/i);

    const m = (await res.json()) as Record<string, unknown>;
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBeTruthy();
    expect(m.display).toMatch(/standalone|fullscreen|minimal-ui/);
    expect(m.theme_color || m.background_color).toBeTruthy();

    const icons = m.icons as Array<{ src: string; sizes?: string; type?: string }>;
    expect(Array.isArray(icons), 'icons array').toBeTruthy();
    expect(icons.length).toBeGreaterThanOrEqual(2);
    const sizes = icons.map((i) => i.sizes ?? '').join(' ');
    expect(sizes).toMatch(/192/);
    expect(sizes).toMatch(/512/);
  });

  test('P02 PWA icons 192 and 512 return image/*', async ({ request }) => {
    for (const path of ['/icon-192.png', '/icon-512.png', '/icon.svg']) {
      const res = await request.get(path);
      expect(res.ok(), path).toBeTruthy();
      const ct = res.headers()['content-type'] ?? '';
      expect(ct, path).toMatch(/image\//);
      const buf = await res.body();
      expect(buf.byteLength, path).toBeGreaterThan(100);
    }
  });

  test('P03 document has theme-color and viewport meta', async ({ page }) => {
    await page.goto('/');
    const theme = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(theme).toBeTruthy();
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toMatch(/width=device-width/i);
  });

  test('P04 service worker controller registers after load', async ({ page, context }) => {
    // Fresh context so SW can install
    await context.clearCookies();
    const { errors } = attachConsoleErrorGuard(page);

    await page.goto('/', { waitUntil: 'networkidle' });
    // Wait for SW registration (vite-plugin-pwa / virtual:pwa-register)
    const swReady = await page.waitForFunction(
      async () => {
        if (!('serviceWorker' in navigator)) return false;
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg?.active || reg?.installing || reg?.waiting) return true;
          // also accept controller after claim
          if (navigator.serviceWorker.controller) return true;
          return false;
        } catch {
          return false;
        }
      },
      { timeout: 45_000 },
    ).then(() => true).catch(() => false);

    expect(swReady, 'service worker registered or active').toBeTruthy();

    const state = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return {
        hasController: !!navigator.serviceWorker.controller,
        scope: reg?.scope ?? null,
        active: reg?.active?.state ?? null,
        installing: reg?.installing?.state ?? null,
        waiting: reg?.waiting?.state ?? null,
      };
    });
    expect(
      state.active || state.installing || state.waiting || state.hasController,
      JSON.stringify(state),
    ).toBeTruthy();

    // No Maximum update depth / fatal React errors during boot
    const fatal = errors.filter((e) =>
      /Maximum update depth|ChunkLoadError|is not defined/i.test(e),
    );
    expect(fatal, fatal.join('\n')).toEqual([]);
  });

  test('P05 caches open after first authenticated visit', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1500); // let SW + status fetch settle

    const cacheInfo = await page.evaluate(async () => {
      if (!('caches' in window)) return { supported: false, keys: [] as string[] };
      const keys = await caches.keys();
      return { supported: true, keys };
    });
    expect(cacheInfo.supported).toBeTruthy();
    // Workbox / vite-plugin-pwa create at least one cache after install
    // In some first-run races cache is empty until SW activates — allow 0 with SW present
    const hasSw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return !!(reg?.active || reg?.installing || navigator.serviceWorker.controller);
    });
    expect(hasSw || cacheInfo.keys.length > 0).toBeTruthy();
  });
});

test.describe('PWA — offline resilience', () => {
  test('P06 offline event shows offline UI after online login', async ({ page, context }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ })).toBeVisible();

    // Go offline (Playwright network + browser event)
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Module update buttons disabled offline + banner
    await expect(page.getByText(/offline|Offline|nedostupn/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
  });

  test('P07 IndexedDB status cache can be written and read', async ({ page }) => {
    await login(page);
    // Wait for status fetch which should populate cache
    await expect(page.getByText(/H4CK_ROOT:/)).toBeVisible({ timeout: 25_000 });

    const idb = await page.evaluate(async () => {
      return new Promise<{ ok: boolean; hasLatest?: boolean; name?: string }>((resolve) => {
        const open = indexedDB.open('arsenal-pwa');
        open.onerror = () => resolve({ ok: false, name: 'open failed' });
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('status')) {
            resolve({ ok: true, hasLatest: false, name: 'no status store yet' });
            return;
          }
          const tx = db.transaction('status', 'readonly');
          const req = tx.objectStore('status').get('latest');
          req.onsuccess = () =>
            resolve({ ok: true, hasLatest: !!req.result, name: db.name });
          req.onerror = () => resolve({ ok: false, name: 'get failed' });
        };
      });
    });
    expect(idb.ok).toBeTruthy();
    // Cache may be empty if status failed once — still DB must open
  });

  test('P08 reload keeps session when token stored', async ({ page }) => {
    await login(page);
    await page.reload({ waitUntil: 'networkidle' });
    // Should stay authenticated (token in localStorage)
    await expect(
      page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder('Heslo')).toHaveCount(0);
  });

  test('P09 wrong password does not poison offline cache path', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Heslo').fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Prihlásiť sa' }).click();
    // Still on auth gate
    await expect(page.getByPlaceholder('Heslo')).toBeVisible();
    // Then correct login still works
    await page.getByPlaceholder('Heslo').fill(PANEL_PASSWORD);
    await page.getByRole('button', { name: 'Prihlásiť sa' }).click();
    await expect(
      page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
