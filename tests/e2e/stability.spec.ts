/**
 * Stability stress suite: rapid navigation, console error budget,
 * auth churn, concurrent API, no infinite re-render.
 */
import { expect, test } from '@playwright/test';
import { attachConsoleErrorGuard, login, PANEL_PASSWORD } from './helpers/auth';

test.describe('Stability — UI stress', () => {
  test('S01 rapid Arsenal ↔ Schrödinger toggles (20×) without crash', async ({ page }) => {
    const { errors } = attachConsoleErrorGuard(page);
    await login(page);

    for (let i = 0; i < 20; i++) {
      await page.getByRole('button', { name: 'Schrödinger' }).click();
      await expect(page.getByRole('heading', { name: 'Schrödinger Scan' })).toBeVisible();
      await page.getByRole('button', { name: 'Arsenal' }).click();
      await expect(
        page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ }),
      ).toBeVisible();
    }

    const fatal = errors.filter((e) =>
      /Maximum update depth|Cannot read prop|is not a function|Hydration/i.test(e),
    );
    expect(fatal, fatal.join('\n')).toEqual([]);
  });

  test('S02 login → logout cycle (5×) stays responsive', async ({ page }) => {
    const { errors } = attachConsoleErrorGuard(page);

    for (let i = 0; i < 5; i++) {
      await login(page);
      await page.getByRole('button', { name: 'Odhlásiť' }).click();
      await expect(page.getByPlaceholder('Heslo')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Prihlásiť sa' })).toBeEnabled();
    }

    // Final login
    await page.getByPlaceholder('Heslo').fill(PANEL_PASSWORD);
    await page.getByRole('button', { name: 'Prihlásiť sa' }).click();
    await expect(
      page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ }),
    ).toBeVisible();

    expect(
      errors.filter((e) => /Maximum update depth/i.test(e)),
      errors.join('\n'),
    ).toEqual([]);
  });

  test('S03 dashboard refresh spam (15×) does not freeze UI', async ({ page }) => {
    const { errors } = attachConsoleErrorGuard(page);
    await login(page);

    const refresh = page.getByRole('button', { name: /Obnoviť|Refresh/i }).first();
    // Fallback: any refresh-like control near status
    const btn = (await refresh.count())
      ? refresh
      : page.locator('button').filter({ hasText: /obnov|refresh/i }).first();

    if (await btn.count()) {
      for (let i = 0; i < 15; i++) {
        await btn.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(80);
      }
    }

    await expect(
      page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aktualizovať modul' }).first()).toBeVisible();

    expect(
      errors.filter((e) => /Maximum update depth/i.test(e)),
    ).toEqual([]);
  });

  test('S04 module Detaily expand/collapse all cards (3 rounds)', async ({ page }) => {
    await login(page);
    await expect(page.getByText(/nástrojov/i).first()).toBeVisible({ timeout: 20_000 });

    for (let round = 0; round < 3; round++) {
      // Re-query each click: after expand the label becomes "Skryť"
      let guard = 0;
      while ((await page.getByRole('button', { name: /^Detaily$/i }).count()) > 0 && guard < 12) {
        await page.getByRole('button', { name: /^Detaily$/i }).first().click();
        guard += 1;
      }
      expect(guard).toBeGreaterThan(0);

      guard = 0;
      while ((await page.getByRole('button', { name: /^Skryť$/i }).count()) > 0 && guard < 12) {
        await page.getByRole('button', { name: /^Skryť$/i }).first().click();
        guard += 1;
      }
    }

    await expect(page.getByRole('heading', { name: 'História jobov' })).toBeVisible();
  });

  test('S05 Schrödinger form thrash: type / clear / retarget', async ({ page }) => {
    const { errors } = attachConsoleErrorGuard(page);
    await login(page);
    await page.getByRole('button', { name: 'Schrödinger' }).click();

    const input = page.getByPlaceholder('example.com');
    const targets = ['example.com', 'scanme.nmap.org', 'localhost', 'invalid..', 'a.b.c'];
    for (const t of targets) {
      await input.fill('');
      await input.fill(t);
      await expect(input).toHaveValue(t);
    }

    await expect(page.getByRole('button', { name: 'Scan', exact: true })).toBeEnabled();
    expect(
      errors.filter((e) => /Maximum update depth/i.test(e)),
    ).toEqual([]);
  });
});

test.describe('Stability — API & session', () => {
  test('S06 concurrent health checks stay 200', async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => request.get('http://127.0.0.1:3847/api/health')),
    );
    for (const r of results) {
      expect(r.status()).toBe(200);
      const j = await r.json();
      expect(j.h4ckRoot || j.version).toBeTruthy();
    }
  });

  test('S07 status endpoint under parallel load', async ({ request }) => {
    const auth = { Authorization: `Bearer ${PANEL_PASSWORD}` };
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request.get('http://127.0.0.1:3847/api/arsenal/status', { headers: auth }),
      ),
    );
    for (const r of results) {
      expect(r.status()).toBe(200);
      const j = await r.json();
      expect(j.modules || j.scannedAt).toBeTruthy();
    }
  });

  test('S08 jobs list survives rapid polling from UI', async ({ page }) => {
    await login(page);
    // Poll history refresh if present
    const histRefresh = page.getByRole('button', { name: /Obnoviť históriu|Refresh/i });
    for (let i = 0; i < 10; i++) {
      if (await histRefresh.count()) {
        await histRefresh.first().click().catch(() => undefined);
      }
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: 'História jobov' })).toBeVisible();
  });

  test('S09 hard navigation / → still authenticates', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('S10 no uncaught Maximum update depth during 30s idle dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    const { errors } = attachConsoleErrorGuard(page);
    await login(page);
    await page.waitForTimeout(30_000);
    await expect(
      page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ }),
    ).toBeVisible();
    expect(
      errors.filter((e) => /Maximum update depth/i.test(e)),
      errors.join('\n'),
    ).toEqual([]);
  });
});

test.describe('Stability — job queue safety', () => {
  test('S11 double-click full install does not spawn runaway UI state', async ({ page }) => {
    const { errors } = attachConsoleErrorGuard(page);
    await login(page);

    const full = page.getByRole('button', { name: /Spustiť full install|full install/i });
    if ((await full.count()) === 0) {
      test.skip();
      return;
    }

    // Double fire — backend should serialize; UI must not explode
    await full.first().dblclick({ force: true }).catch(async () => {
      await full.first().click();
      await full.first().click();
    });
    await page.waitForTimeout(2000);

    // UI still interactive
    await expect(
      page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Odhlásiť' })).toBeVisible();

    expect(
      errors.filter((e) => /Maximum update depth/i.test(e)),
    ).toEqual([]);
  });
});
