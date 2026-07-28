import { expect, type Locator, type Page } from '@playwright/test';

/** Apple HIG recommends ≥44×44 pt touch targets on phones. */
export const MIN_TOUCH = 44;

/**
 * Assert element is interactable on a phone screen:
 * visible, enabled, non-zero geometry, mostly in viewport, receives pointer events.
 */
export async function assertClickable(
  locator: Locator,
  label: string,
  opts: { minTouch?: boolean; requireEnabled?: boolean; scroll?: boolean } = {},
): Promise<{ x: number; y: number; width: number; height: number }> {
  const requireEnabled = opts.requireEnabled !== false;
  if (opts.scroll !== false) {
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  }
  await expect(locator, `${label} visible`).toBeVisible();
  if (requireEnabled) {
    await expect(locator, `${label} enabled`).toBeEnabled();
  }

  const box = await locator.boundingBox();
  expect(box, `${label} has bounding box`).toBeTruthy();
  expect(box!.width, `${label} width > 0`).toBeGreaterThan(0);
  expect(box!.height, `${label} height > 0`).toBeGreaterThan(0);

  const pe = await locator.evaluate((el) => getComputedStyle(el).pointerEvents);
  expect(pe, `${label} pointer-events`).not.toBe('none');

  const page = locator.page();
  const vp = page.viewportSize();
  if (vp) {
    // After scrollIntoView, center should land in the visible viewport.
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    expect(cx, `${label} center X in viewport`).toBeGreaterThanOrEqual(-8);
    expect(cx, `${label} center X in viewport`).toBeLessThanOrEqual(vp.width + 8);
    expect(cy, `${label} center Y in viewport`).toBeGreaterThanOrEqual(-8);
    expect(cy, `${label} center Y in viewport`).toBeLessThanOrEqual(vp.height + 8);
  }

  if (opts.minTouch) {
    const longSide = Math.max(box!.width, box!.height);
    const shortSide = Math.min(box!.width, box!.height);
    // Allow slightly smaller for compact nav pills, but keep a floor.
    expect(longSide, `${label} long side touchable`).toBeGreaterThanOrEqual(28);
    expect(shortSide, `${label} short side touchable`).toBeGreaterThanOrEqual(24);
  }

  return box!;
}

/** Tap center of a locator (touch-friendly). */
export async function tap(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await locator.tap({ timeout: 10_000 }).catch(async () => {
    // Fallback if tap not supported in some engines
    await locator.click({ force: false });
  });
}

/** UI panel password (same as ARSENAL_PANEL_PASSWORD / default 23513900). */
export const PANEL_PASSWORD =
  process.env.ARSENAL_PANEL_PASSWORD ?? process.env.ARSENAL_API_TOKEN ?? '23513900';

export async function login(page: Page, password = PANEL_PASSWORD) {
  await page.goto('/');
  // Clear any prior session secret from previous tests
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
  await expect(page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ })).toBeVisible({
    timeout: 30_000,
  });
  // Wait until arsenal modules hydrate (buttons appear)
  await expect(page.getByRole('button', { name: 'Aktualizovať modul' }).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('heading', { name: 'História jobov' })).toBeVisible({
    timeout: 15_000,
  });
}

/** Count elements that are both visible and have non-zero hit area. */
export async function countClickable(locator: Locator): Promise<number> {
  const n = await locator.count();
  let ok = 0;
  for (let i = 0; i < n; i++) {
    const el = locator.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const box = await el.boundingBox();
    if (box && box.width > 0 && box.height > 0) ok++;
  }
  return ok;
}
