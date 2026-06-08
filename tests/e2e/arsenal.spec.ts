import { expect, type Page, test } from '@playwright/test';

const TOKEN = process.env.ARSENAL_API_TOKEN ?? 'dev-token-change-me';

/** Log in through the AuthGate and wait for the dashboard to render. */
async function login(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByPlaceholder('API token').fill(TOKEN);
  await page.getByRole('button', { name: 'Prihlásiť sa' }).click();
  await expect(
    page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ }),
  ).toBeVisible();
}

test.describe('Arsenal PWA — browser E2E', () => {
  test('login → dashboard renders modules and job history', async ({ page }) => {
    await login(page);

    await expect(page.getByRole('heading', { name: 'Exploit Tools' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI / OSINT Tools' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aktualizovať modul' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'História jobov' })).toBeVisible();
  });

  test('Schrödinger page advertises 4 vantage points', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Schrödinger' }).click();

    await expect(page.getByRole('heading', { name: 'Schrödinger Scan' })).toBeVisible();
    await expect(page.getByText('4 vantage points')).toBeVisible();
    await expect(page.getByPlaceholder('example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scan', exact: true })).toBeVisible();
  });

  test('scan runs all 4 vantages including the Palimpsest timeline', async ({ page }) => {
    test.slow(); // live recon: DNS resolvers + Wayback history + path re-checks

    await login(page);
    await page.getByRole('button', { name: 'Schrödinger' }).click();

    await page.getByPlaceholder('example.com').fill('scanme.nmap.org');
    await page.getByRole('button', { name: 'Scan', exact: true }).click();

    // Wait for the scan to finish (status badge flips to completed).
    await expect(page.getByText('completed')).toBeVisible({ timeout: 90_000 });

    // All four vantage columns render.
    await expect(page.getByRole('heading', { name: 'DNS Resolvers (30)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'User-Agent HTTP (3)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Network vs Web' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Time · Palimpsest/ })).toBeVisible();

    // Quantum Matrix classification panel is present.
    await expect(page.getByRole('heading', { name: 'Quantum Matrix' })).toBeVisible();

    // The Palimpsest timeline slider is interactive when Wayback returns history.
    const slider = page.getByRole('slider', { name: 'Timeline year' });
    if (await slider.count()) {
      await expect(page.getByRole('heading', { name: /Palimpsest · časová os/ })).toBeVisible();
      const yearButtons = page.locator('button', { hasText: /^\d{2}$/ });
      const count = await yearButtons.count();
      expect(count).toBeGreaterThan(0);
      // Jump to the earliest archived year and confirm the panel reacts.
      await yearButtons.first().click();
      await expect(page.getByText(/Verejné cesty v \d{4}/)).toBeVisible();
    }

    // Shadow Diff records this scan as the baseline for the target (fresh context).
    await expect(page.getByRole('heading', { name: 'Shadow Diff' })).toBeVisible();
    await expect(page.getByText(/baseline/)).toBeVisible();
  });
});
