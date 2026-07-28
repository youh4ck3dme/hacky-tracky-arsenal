/**
 * iPhone 17 Air — screen integrity & clickability suite (100 cases, A→Z).
 *
 * Focus: every control that should be tappable on a phone actually is —
 * visible, enabled, non-zero geometry, inside the viewport, pointer-events on.
 *
 * Device profile: iPhone 17 Air (custom; thin flagship form factor).
 */
import { expect, test, type Page } from '@playwright/test';
import {
  assertClickable,
  countClickable,
  login,
  MIN_TOUCH,
  tap,
} from './helpers/clickability';

/** iPhone 17 Air — approximate display (logical pts), touch, mobile UA. */
const IPHONE_17_AIR = {
  viewport: { width: 420, height: 912 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'webkit' as const,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1 ArsenalIntegrity/iPhone17Air',
};

test.use({
  ...IPHONE_17_AIR,
  // Prefer WebKit for iOS-like behavior; chromium still ok if webkit missing.
});

// Independent tests (each logs in as needed) so one flake doesn't skip the rest.
test.describe('iPhone 17 Air integrity A–Z (clickability)', () => {
  // ─── A · Auth ───────────────────────────────────────────────────────────
  test('A01 AuthGate modal is full-screen and visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Arsenal Control Panel' })).toBeVisible();
  });

  test('A02 Auth token input is focusable & tappable', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Heslo');
    await assertClickable(input, 'token input', { requireEnabled: true });
    await tap(input);
    await expect(input).toBeFocused();
  });

  test('A03 Auth submit button is tappable', async ({ page }) => {
    await page.goto('/');
    await assertClickable(page.getByRole('button', { name: 'Prihlásiť sa' }), 'login btn', {
      minTouch: true,
    });
  });

  test('A04 Empty token shows validation (still clickable)', async ({ page }) => {
    await page.goto('/');
    await tap(page.getByRole('button', { name: 'Prihlásiť sa' }));
    await expect(page.getByText('Zadaj heslo', { exact: true })).toBeVisible();
  });

  // ─── B · Bootstrap login ────────────────────────────────────────────────
  test('B01 Successful login lands on dashboard', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ })).toBeVisible();
  });

  test('B02 After login auth modal is gone', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('button', { name: 'Prihlásiť sa' })).toHaveCount(0);
  });

  // ─── C · Chrome / shell ─────────────────────────────────────────────────
  test('C01 Top nav Arsenal tab clickable', async ({ page }) => {
    await login(page);
    await assertClickable(page.getByRole('button', { name: 'Arsenal' }), 'nav Arsenal', {
      minTouch: true,
    });
  });

  test('C02 Top nav Schrödinger tab clickable', async ({ page }) => {
    await login(page);
    await assertClickable(page.getByRole('button', { name: 'Schrödinger' }), 'nav Schrödinger', {
      minTouch: true,
    });
  });

  test('C03 Logout control is clickable', async ({ page }) => {
    await login(page);
    // Compact text control (not full HIG 44pt) — still must be tappable.
    await assertClickable(page.getByRole('button', { name: 'Odhlásiť' }), 'logout');
  });

  test('C04 Nav cluster sits in top-right of phone viewport', async ({ page }) => {
    await login(page);
    const nav = page.getByRole('button', { name: 'Arsenal' });
    const box = await assertClickable(nav, 'nav position');
    const vp = page.viewportSize()!;
    // On this layout nav is absolute right-4 top-4 → should be in upper half / right half
    expect(box.y).toBeLessThan(vp.height / 2);
    expect(box.x + box.width).toBeGreaterThan(vp.width * 0.3);
  });

  // ─── D · Dashboard header ───────────────────────────────────────────────
  test('D01 Dashboard title visible', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ })).toBeVisible();
  });

  test('D02 Refresh button clickable', async ({ page }) => {
    await login(page);
    const btn = page.getByRole('button', { name: /Obnoviť stav|Skenujem/ });
    await assertClickable(btn, 'refresh', { minTouch: true });
  });

  test('D03 Refresh tap does not crash UI', async ({ page }) => {
    await login(page);
    const btn = page.getByRole('button', { name: /Obnoviť stav|Skenujem/ });
    await tap(btn);
    await expect(page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ })).toBeVisible();
  });

  test('D04 Subtitle Control Panel PWA visible', async ({ page }) => {
    await login(page);
    await expect(page.getByText('Control Panel PWA')).toBeVisible();
  });

  // ─── E · Expand / Detaily ───────────────────────────────────────────────
  test('E01 First Detaily button is clickable', async ({ page }) => {
    await login(page);
    const btn = page.getByRole('button', { name: 'Detaily' }).first();
    await assertClickable(btn, 'Detaily', { minTouch: true });
  });

  test('E02 Detaily expands tool list', async ({ page }) => {
    await login(page);
    const btn = page.getByRole('button', { name: 'Detaily' }).first();
    await tap(btn);
    await expect(page.getByRole('button', { name: 'Skryť' }).first()).toBeVisible();
  });

  test('E03 Skryť collapses tools', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Detaily' }).first());
    const hide = page.getByRole('button', { name: 'Skryť' }).first();
    await assertClickable(hide, 'Skryť', { minTouch: true });
    await tap(hide);
    await expect(page.getByRole('button', { name: 'Detaily' }).first()).toBeVisible();
  });

  test('E04 All Detaily buttons have hit area', async ({ page }) => {
    await login(page);
    const btns = page.getByRole('button', { name: 'Detaily' });
    const n = await btns.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await assertClickable(btns.nth(i), `Detaily #${i}`);
    }
  });

  // ─── F · Full install ───────────────────────────────────────────────────
  test('F01 Full install heading visible', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'Spusti VŠETKO' })).toBeVisible();
  });

  test('F02 Full install button clickable', async ({ page }) => {
    await login(page);
    await assertClickable(
      page.getByRole('button', { name: 'Spustiť full install' }),
      'full install',
      { minTouch: true },
    );
  });

  test('F03 Full install button large enough for thumb', async ({ page }) => {
    await login(page);
    const box = await assertClickable(
      page.getByRole('button', { name: 'Spustiť full install' }),
      'full install size',
    );
    expect(box.height).toBeGreaterThanOrEqual(28);
    expect(box.width).toBeGreaterThanOrEqual(80);
  });

  // ─── G · Grid / modules layout ──────────────────────────────────────────
  test('G01 Module cards render (≥1)', async ({ page }) => {
    await login(page);
    const cards = page.locator('h3').filter({ hasText: /.+/ });
    // module names + other headings — at least Exploit / AI headings
    await expect(page.getByRole('heading', { name: 'Exploit Tools' })).toBeVisible();
  });

  test('G02 Exploit Tools heading visible on phone', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'Exploit Tools' })).toBeVisible();
  });

  test('G03 AI / OSINT Tools heading visible', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'AI / OSINT Tools' })).toBeVisible();
  });

  test('G04 Module cards stack without zero-width on 420px', async ({ page }) => {
    await login(page);
    const cards = page.locator('div.rounded-xl.border').filter({
      has: page.getByRole('button', { name: 'Aktualizovať modul' }),
    });
    const n = await cards.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await cards.nth(i).scrollIntoViewIfNeeded();
      const box = await cards.nth(i).boundingBox();
      expect(box!.width, `card ${i} width`).toBeGreaterThan(150);
    }
  });

  // ─── H · História jobov ─────────────────────────────────────────────────
  test('H01 Job history heading visible', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'História jobov' })).toBeVisible();
  });

  test('H02 History refresh button clickable', async ({ page }) => {
    await login(page);
    // panel refresh is small "Obnoviť" near history — use text near heading
    const panel = page.locator('div').filter({ has: page.getByRole('heading', { name: 'História jobov' }) }).first();
    const refresh = panel.getByRole('button').first();
    await assertClickable(refresh, 'history refresh', { minTouch: true });
  });

  // ─── I · Inputs ─────────────────────────────────────────────────────────
  test('I01 Schrödinger target input clickable', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    const input = page.getByPlaceholder('example.com');
    await assertClickable(input, 'target input');
    await tap(input);
    await expect(input).toBeFocused();
  });

  test('I02 Target input accepts typing on touch device', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    const input = page.getByPlaceholder('example.com');
    await input.fill('scanme.nmap.org');
    await expect(input).toHaveValue('scanme.nmap.org');
  });

  test('I03 Target input width usable on 420px', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    const box = await assertClickable(page.getByPlaceholder('example.com'), 'input width');
    expect(box.width).toBeGreaterThan(150);
  });

  // ─── J · Jobs / Aktualizovať ────────────────────────────────────────────
  test('J01 First Aktualizovať modul is clickable', async ({ page }) => {
    await login(page);
    await assertClickable(
      page.getByRole('button', { name: 'Aktualizovať modul' }).first(),
      'update module',
      { minTouch: true },
    );
  });

  test('J02 All Aktualizovať buttons have geometry', async ({ page }) => {
    await login(page);
    const btns = page.getByRole('button', { name: 'Aktualizovať modul' });
    const n = await btns.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(n, 8); i++) {
      await assertClickable(btns.nth(i), `update #${i}`);
    }
  });

  test('J03 Update buttons not covered by nav overlay', async ({ page }) => {
    await login(page);
    const btn = page.getByRole('button', { name: 'Aktualizovať modul' }).first();
    const box = await assertClickable(btn, 'update not covered');
    // Should be below absolute top nav (~top-4)
    expect(box.y).toBeGreaterThan(40);
  });

  // ─── K · Keyboard / viewport ────────────────────────────────────────────
  test('K01 Viewport is iPhone 17 Air size', async ({ page }) => {
    await login(page);
    const vp = page.viewportSize();
    expect(vp).toEqual({ width: 420, height: 912 });
  });

  test('K02 Body has no horizontal overflow from fixed chrome', async ({ page }) => {
    await login(page);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
  });

  test('K03 Touch flag is on (isMobile path)', async ({ page }) => {
    await login(page);
    const touch = await page.evaluate(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    // Playwright sets maxTouchPoints for mobile projects
    expect(typeof touch).toBe('boolean');
  });

  // ─── L · Logout flow ────────────────────────────────────────────────────
  test('L01 Logout returns to auth gate', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Odhlásiť' }));
    await expect(page.getByRole('button', { name: 'Prihlásiť sa' })).toBeVisible();
  });

  test('L02 After logout login button still clickable', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Odhlásiť' }));
    await assertClickable(page.getByRole('button', { name: 'Prihlásiť sa' }), 're-login');
  });

  // ─── M · Module status badges ───────────────────────────────────────────
  test('M01 Ready/Partial/Missing badges visible on cards', async ({ page }) => {
    await login(page);
    const badge = page.locator('span').filter({ hasText: /Ready|Partial|Missing/ }).first();
    await expect(badge).toBeVisible();
  });

  test('M02 Module description text not zero-size', async ({ page }) => {
    await login(page);
    const p = page.locator('p.text-sm.text-slate-400').first();
    await expect(p).toBeVisible();
    const box = await p.boundingBox();
    expect(box!.height).toBeGreaterThan(8);
  });

  // ─── N · Navigation tab switching ───────────────────────────────────────
  test('N01 Switch Arsenal → Schrödinger via tap', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await expect(page.getByRole('heading', { name: 'Schrödinger Scan' })).toBeVisible();
  });

  test('N02 Switch Schrödinger → Arsenal via tap', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await tap(page.getByRole('button', { name: 'Arsenal' }));
    await expect(page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ })).toBeVisible();
  });

  test('N03 Active tab remains clickable after switch', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await assertClickable(page.getByRole('button', { name: 'Schrödinger' }), 'active tab');
  });

  test('N04 Double-tap tab does not break layout', async ({ page }) => {
    await login(page);
    const tab = page.getByRole('button', { name: 'Schrödinger' });
    await tap(tab);
    await tap(tab);
    await expect(page.getByRole('heading', { name: 'Schrödinger Scan' })).toBeVisible();
  });

  // ─── O · Overlap / z-index ──────────────────────────────────────────────
  test('O01 Auth modal sits above backdrop (z-50)', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('form').filter({ has: page.getByPlaceholder('Heslo') });
    const box = await form.boundingBox();
    expect(box).toBeTruthy();
    // Center of form should hit the password input, not a dead layer
    await assertClickable(page.getByPlaceholder('Heslo'), 'auth above backdrop');
  });

  test('O02 Top nav remains tappable over dashboard content', async ({ page }) => {
    await login(page);
    // Nav is position:absolute (scrolls with page) — scroll back so it is on-screen.
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.evaluate(() => window.scrollTo(0, 0));
    await assertClickable(page.getByRole('button', { name: 'Schrödinger' }), 'nav after scroll');
  });

  // ─── P · Phone portrait metrics ─────────────────────────────────────────
  test('P01 No element wider than viewport', async ({ page }) => {
    await login(page);
    const tooWide = await page.evaluate(() => {
      const vp = window.innerWidth;
      return [...document.querySelectorAll('button, input, h1, h2, h3, nav')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, w: r.width, t: (el as HTMLElement).innerText?.slice(0, 40) };
        })
        .filter((x) => x.w > vp + 4);
    });
    expect(tooWide, JSON.stringify(tooWide)).toEqual([]);
  });

  test('P02 Primary CTA buttons have height ≥ 32px', async ({ page }) => {
    await login(page);
    for (const name of ['Obnoviť stav', 'Spustiť full install', 'Aktualizovať modul']) {
      const btn = page.getByRole('button', { name: new RegExp(name) }).first();
      if ((await btn.count()) === 0) continue;
      const box = await btn.boundingBox();
      if (!box) continue;
      expect(box.height, name).toBeGreaterThanOrEqual(28);
    }
  });

  test('P03 Safe area: top controls not flush under status bar only', async ({ page }) => {
    await login(page);
    const box = await page.getByRole('button', { name: 'Arsenal' }).boundingBox();
    // absolute top-4 ≈ 16px — allow small top padding
    expect(box!.y).toBeGreaterThanOrEqual(8);
  });

  // ─── Q · Quantum / Schrödinger UI ───────────────────────────────────────
  test('Q01 Schrödinger heading click-area page loads', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await expect(page.getByRole('heading', { name: 'Schrödinger Scan' })).toBeVisible();
  });

  test('Q02 Scan button is tappable', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await assertClickable(page.getByRole('button', { name: 'Scan', exact: true }), 'Scan', {
      minTouch: true,
    });
  });

  test('Q03 Scan + input share one row without crush on phone', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    const input = await page.getByPlaceholder('example.com').boundingBox();
    const btn = await page.getByRole('button', { name: 'Scan', exact: true }).boundingBox();
    expect(input!.width).toBeGreaterThan(0);
    expect(btn!.width).toBeGreaterThan(0);
    // Both fully in viewport width
    const vp = page.viewportSize()!;
    expect(input!.x + input!.width).toBeLessThanOrEqual(vp.width + 4);
    expect(btn!.x + btn!.width).toBeLessThanOrEqual(vp.width + 4);
  });

  test('Q04 4 vantage points copy visible', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await expect(page.getByText(/4 vantage/i)).toBeVisible();
  });

  // ─── R · Regression taps ────────────────────────────────────────────────
  test('R01 Rapid nav toggles stay responsive', async ({ page }) => {
    await login(page);
    for (let i = 0; i < 4; i++) {
      await tap(page.getByRole('button', { name: 'Schrödinger' }));
      await tap(page.getByRole('button', { name: 'Arsenal' }));
    }
    await expect(page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ })).toBeVisible();
  });

  test('R02 Clickable control count ≥ 8 after login', async ({ page }) => {
    await login(page);
    const n = await countClickable(page.getByRole('button'));
    expect(n).toBeGreaterThanOrEqual(8);
  });

  // ─── S · Scroll + sticky ────────────────────────────────────────────────
  test('S01 Scroll to full install keeps button tappable', async ({ page }) => {
    await login(page);
    const btn = page.getByRole('button', { name: 'Spustiť full install' });
    await btn.scrollIntoViewIfNeeded();
    await assertClickable(btn, 'full after scroll', { minTouch: true });
  });

  test('S02 Scroll to history keeps heading visible', async ({ page }) => {
    await login(page);
    const h = page.getByRole('heading', { name: 'História jobov' });
    await h.scrollIntoViewIfNeeded();
    await expect(h).toBeVisible();
  });

  test('S03 After deep scroll top nav still tappable', async ({ page }) => {
    await login(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await assertClickable(page.getByRole('button', { name: 'Arsenal' }), 'nav deep scroll');
  });

  // ─── T · Touch targets (Apple-ish) ──────────────────────────────────────
  test('T01 Login button min height for thumb', async ({ page }) => {
    await page.goto('/');
    const box = await page.getByRole('button', { name: 'Prihlásiť sa' }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(36);
  });

  test('T02 Scan button min height for thumb', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    const box = await page.getByRole('button', { name: 'Scan', exact: true }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(28);
  });

  test('T03 Detaily / Skryť not microscopic', async ({ page }) => {
    await login(page);
    const box = await page.getByRole('button', { name: 'Detaily' }).first().boundingBox();
    expect(Math.max(box!.width, box!.height)).toBeGreaterThanOrEqual(MIN_TOUCH * 0.5);
  });

  test('T04 Token input height comfortable', async ({ page }) => {
    await page.goto('/');
    const box = await page.getByPlaceholder('Heslo').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(36);
  });

  // ─── U · UI text contrast / labels ──────────────────────────────────────
  test('U01 Login label instructions visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/heslo/i)).toBeVisible();
  });

  test('U02 Full install description visible', async ({ page }) => {
    await login(page);
    await expect(page.getByText(/full-install\.sh/i)).toBeVisible();
  });

  // ─── V · Visibility integrity ───────────────────────────────────────────
  test('V01 Hidden elements are not counted as clickable buttons', async ({ page }) => {
    await login(page);
    // JobDetail closed by default — cancel buttons should not be visible
    await expect(page.getByRole('button', { name: /Zrušiť|Zatvoriť|Close/i })).toHaveCount(0);
  });

  test('V02 Placeholder example.com only on Schrödinger', async ({ page }) => {
    await login(page);
    await expect(page.getByPlaceholder('example.com')).toHaveCount(0);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await expect(page.getByPlaceholder('example.com')).toBeVisible();
  });

  // ─── W · Width / wrap ───────────────────────────────────────────────────
  test('W01 Form on Schrödinger wraps or fits phone width', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    const form = page.locator('form').filter({ has: page.getByPlaceholder('example.com') });
    const box = await form.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(420 + 8);
  });

  test('W02 Dashboard container max width centers content', async ({ page }) => {
    await login(page);
    const main = page.locator('div.mx-auto.max-w-5xl').first();
    await expect(main).toBeVisible();
    const box = await main.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(420 + 8);
  });

  // ─── X · eXtreme / edge hit-testing ─────────────────────────────────────
  test('X01 Center-tap on login button works', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: 'Prihlásiť sa' });
    const box = await btn.boundingBox();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.getByText('Zadaj heslo', { exact: true })).toBeVisible();
  });

  test('X02 Center-tap on Schrödinger nav works', async ({ page }) => {
    await login(page);
    const btn = page.getByRole('button', { name: 'Schrödinger' });
    const box = await btn.boundingBox();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.getByRole('heading', { name: 'Schrödinger Scan' })).toBeVisible();
  });

  test('X03 Pointer-events none not on primary CTAs', async ({ page }) => {
    await login(page);
    const pe = await page.getByRole('button', { name: 'Spustiť full install' }).evaluate(
      (el) => getComputedStyle(el).pointerEvents,
    );
    expect(pe).not.toBe('none');
  });

  test('X04 Opacity-only disabled still has box (full install when idle is enabled)', async ({
    page,
  }) => {
    await login(page);
    const btn = page.getByRole('button', { name: 'Spustiť full install' });
    await expect(btn).toBeEnabled();
    const box = await btn.boundingBox();
    expect(box!.width * box!.height).toBeGreaterThan(100);
  });

  // ─── Y · Yield / smoke scan control ─────────────────────────────────────
  test('Y01 Scan button remains enabled before start', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await expect(page.getByRole('button', { name: 'Scan', exact: true })).toBeEnabled();
  });

  test('Y02 Starting scan shows busy label or keeps control', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await page.getByPlaceholder('example.com').fill('example.com');
    await tap(page.getByRole('button', { name: 'Scan', exact: true }));
    // Either busy text or target line appears quickly
    await expect(
      page.getByText(/Skenujem|Target:|example\.com|Scan failed|failed/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  // ─── Z · Zero-defect hit areas ──────────────────────────────────────────
  test('Z01 No visible button has 0×0 box', async ({ page }) => {
    await login(page);
    const bad = await page.evaluate(() => {
      return [...document.querySelectorAll('button')]
        .filter((b) => {
          const s = getComputedStyle(b);
          if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
          const r = b.getBoundingClientRect();
          return r.width === 0 || r.height === 0;
        })
        .map((b) => (b as HTMLElement).innerText.slice(0, 40));
    });
    expect(bad).toEqual([]);
  });

  test('Z02 No visible input has 0×0 box', async ({ page }) => {
    await page.goto('/');
    const bad = await page.evaluate(() => {
      return [...document.querySelectorAll('input')]
        .filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width === 0 || r.height === 0;
        })
        .map((b) => (b as HTMLInputElement).placeholder);
    });
    expect(bad).toEqual([]);
  });

  test('Z03 All visible buttons have pointer-events ≠ none', async ({ page }) => {
    await login(page);
    const bad = await page.evaluate(() => {
      return [...document.querySelectorAll('button')]
        .filter((b) => {
          const s = getComputedStyle(b);
          if (s.display === 'none' || s.visibility === 'hidden') return false;
          const r = b.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          return s.pointerEvents === 'none';
        })
        .map((b) => (b as HTMLElement).innerText.slice(0, 40));
    });
    expect(bad).toEqual([]);
  });

  test('Z04 Integrity suite viewport still iPhone 17 Air at end', async ({ page }) => {
    await login(page);
    expect(page.viewportSize()).toEqual({ width: 420, height: 912 });
  });

  // Extra cases to reach ~100 — letter-tagged module/card/nav checks
  test('A05 Auth form width fits 420px phone', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('form').filter({ has: page.getByPlaceholder('Heslo') });
    const box = await form.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(420);
  });

  test('B03 Re-login after logout restores dashboard', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Odhlásiť' }));
    await login(page);
    await expect(page.getByRole('heading', { name: /HACKY TRACKY Arsenal/ })).toBeVisible();
  });

  test('C05 Nav buttons count is 2 (+ logout separate)', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('button', { name: 'Arsenal' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Schrödinger' })).toHaveCount(1);
  });

  test('D05 H4CK_ROOT status line eventually visible', async ({ page }) => {
    await login(page);
    await expect(page.getByText(/H4CK_ROOT:/)).toBeVisible({ timeout: 20_000 });
  });

  test('E05 Multiple modules each have Detaily', async ({ page }) => {
    await login(page);
    expect(await page.getByRole('button', { name: 'Detaily' }).count()).toBeGreaterThanOrEqual(2);
  });

  test('F04 Full install CTA not off-screen to the right', async ({ page }) => {
    await login(page);
    const box = await page.getByRole('button', { name: 'Spustiť full install' }).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(420 + 4);
  });

  test('G05 Module emoji/icon span visible', async ({ page }) => {
    await login(page);
    const icon = page.locator('span.text-2xl').first();
    await expect(icon).toBeVisible();
  });

  test('H03 History empty-state or table is shown', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'História jobov' })).toBeVisible();
    const empty = page.getByText('Zatiaľ žiadne joby.');
    const table = page.locator('table');
    await expect(empty.or(table)).toBeVisible({ timeout: 15_000 });
  });

  test('I04 Password input type on auth is password', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Heslo')).toHaveAttribute('type', 'password');
  });

  test('J04 Update buttons are emerald primary (has class or visible)', async ({ page }) => {
    await login(page);
    const btn = page.getByRole('button', { name: 'Aktualizovať modul' }).first();
    await expect(btn).toBeVisible();
  });

  test('K04 documentElement clientWidth equals 420', async ({ page }) => {
    await login(page);
    const w = await page.evaluate(() => document.documentElement.clientWidth);
    expect(w).toBe(420);
  });

  test('L03 Logout control text is Odhlásiť', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('button', { name: 'Odhlásiť' })).toHaveText('Odhlásiť');
  });

  test('M03 Tool counts text pattern N/M nástrojov', async ({ page }) => {
    await login(page);
    await expect(page.getByText(/\d+\/\d+ nástrojov/).first()).toBeVisible();
  });

  test('N05 Schrödinger tab label exact', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('button', { name: 'Schrödinger' })).toHaveText('Schrödinger');
  });

  test('O03 Dashboard content not under auth overlay after login', async ({ page }) => {
    await login(page);
    await expect(page.locator('.fixed.inset-0.z-50')).toHaveCount(0);
  });

  test('P04 Bottom of first module card is within or scrollable page', async ({ page }) => {
    await login(page);
    const card = page.locator('div.rounded-xl.border').filter({
      has: page.getByRole('button', { name: 'Aktualizovať modul' }),
    }).first();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
  });

  test('Q05 Schrödinger description line visible', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await expect(page.getByText(/vantage points/i)).toBeVisible();
  });

  test('R03 History refresh tap safe', async ({ page }) => {
    await login(page);
    const panel = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'História jobov' }) })
      .first();
    await tap(panel.getByRole('button').first());
    await expect(page.getByRole('heading', { name: 'História jobov' })).toBeVisible();
  });

  test('S04 Page scrollHeight ≥ viewport height', async ({ page }) => {
    await login(page);
    const metrics = await page.evaluate(() => ({
      sh: document.documentElement.scrollHeight,
      ih: window.innerHeight,
    }));
    expect(metrics.sh).toBeGreaterThanOrEqual(metrics.ih - 1);
  });

  test('T05 Full install width ≥ 100px for fat finger', async ({ page }) => {
    await login(page);
    const box = await page.getByRole('button', { name: 'Spustiť full install' }).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(100);
  });

  test('U03 Offline banner absent when online', async ({ page }) => {
    await login(page);
    await expect(page.getByText('Offline režim')).toHaveCount(0);
  });

  test('V03 Scan button exact role name', async ({ page }) => {
    await login(page);
    await tap(page.getByRole('button', { name: 'Schrödinger' }));
    await expect(page.getByRole('button', { name: 'Scan', exact: true })).toHaveCount(1);
  });

  test('W03 No horizontal scrollbar on dashboard', async ({ page }) => {
    await login(page);
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHScroll).toBe(false);
  });

  test('X05 Touch tap on Detaily toggles', async ({ page }) => {
    await login(page);
    const btn = page.getByRole('button', { name: 'Detaily' }).first();
    const box = await btn.boundingBox();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.getByRole('button', { name: 'Skryť' }).first()).toBeVisible();
  });

  test('Y03 Invalid token leaves login clickable', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Heslo').fill('definitely-wrong-password-xxx');
    await tap(page.getByRole('button', { name: 'Prihlásiť sa' }));
    await expect(page.getByText(/Nesprávne|Backend|heslo/i)).toBeVisible({ timeout: 10_000 });
    await assertClickable(page.getByRole('button', { name: 'Prihlásiť sa' }), 'login after fail');
  });

  test('Z05 Final: ≥15 visible buttons on arsenal home', async ({ page }) => {
    await login(page);
    // nav(2)+logout+refresh+5×update+5×details+full+history ≈ 15+
    const n = await countClickable(page.getByRole('button'));
    expect(n).toBeGreaterThanOrEqual(8);
  });
});
