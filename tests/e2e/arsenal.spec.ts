import { expect, type Page, test } from '@playwright/test';

const PASSWORD = process.env.ARSENAL_PANEL_PASSWORD ?? '23513900';

/** Log in through the AuthGate (panel password) and wait for the dashboard. */
async function login(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByPlaceholder('Heslo').fill(PASSWORD);
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

  test('mock-mode scan completes with 4 vantages, risk_score, matrix', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Schrödinger' }).click();

    await page.getByPlaceholder('example.com').fill('example.com');
    await page.getByRole('button', { name: 'Scan', exact: true }).click();

    // Mock path should finish in seconds; keep headroom for cold start.
    await expect(page.getByText('completed')).toBeVisible({ timeout: 20_000 });

    // Four vantage columns (names may include sample counts / profile).
    await expect(page.getByRole('heading', { name: /DNS Resolvers/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /User-Agent HTTP/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Network vs Web/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Time · Palimpsest/ })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Quantum Matrix' })).toBeVisible();
    await expect(page.getByTestId('risk-score')).toBeVisible();
    await expect(page.getByTestId('risk-score-inline')).toBeVisible();

    // Mock mode badge + DNS mock notice (SK)
    await expect(page.getByText(/mode mock/i)).toBeVisible();
    await expect(page.getByTestId('scan-notices')).toBeVisible();

    // Column count badges present
    await expect(page.getByTestId('vantage-dns')).toBeVisible();
    await expect(page.getByTestId('vantage-ua')).toBeVisible();
    await expect(page.getByTestId('vantage-netweb')).toBeVisible();
    await expect(page.getByTestId('vantage-time')).toBeVisible();

    // Palimpsest timeline when mock history exists
    const slider = page.getByRole('slider', { name: 'Timeline year' });
    if (await slider.count()) {
      await expect(page.getByRole('heading', { name: /Palimpsest · časová os/ })).toBeVisible();
    }

    await expect(page.getByRole('heading', { name: 'Shadow Diff' })).toBeVisible();
    await expect(page.getByText(/baseline/)).toBeVisible();
  });
});

