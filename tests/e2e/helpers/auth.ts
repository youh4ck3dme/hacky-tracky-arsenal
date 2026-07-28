import { expect, type Page } from '@playwright/test';

/** UI panel password (ARSENAL_PANEL_PASSWORD / default). */
export const PANEL_PASSWORD =
  process.env.ARSENAL_PANEL_PASSWORD ?? process.env.ARSENAL_API_TOKEN ?? '23513900';

/** Clear storage and log in through AuthGate. */
export async function login(page: Page, password = PANEL_PASSWORD): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto('/');
  await page.getByPlaceholder('Heslo').fill(password);
  await page.getByRole('button', { name: 'Prihlásiť sa' }).click();
  await expect(
    page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ }),
  ).toBeVisible({ timeout: 20_000 });
}

/** Collect browser console errors (filters noisy vite HMR). */
export function attachConsoleErrorGuard(page: Page): { errors: string[] } {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Ignore known benign noise
    if (/Failed to load resource.*favicon/i.test(text)) return;
    if (/Download the React DevTools/i.test(text)) return;
    if (/\[vite\]/i.test(text)) return;
    if (/NetInfo|offline/i.test(text)) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return { errors };
}
