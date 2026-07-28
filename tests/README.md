# Test suite

Automated tests for Arsenal PWA — unit, integration API, bash E2E smoke, and Playwright browser E2E.

## Commands

```bash
cd h4ck/arsenal-pwa
pnpm test                 # Vitest: unit + integration (~5 s)
pnpm test:unit            # Unit tests only
pnpm test:integration     # API integration only
pnpm test:e2e             # Bash smoke-test (AI job + Schrödinger, ~30–60 s)
pnpm test:browser         # Playwright browser E2E (Chromium, boots app, ~1–2 min)
pnpm test:browser:headed  # Same, with a visible browser
pnpm test:browser:report  # Open the last HTML report
pnpm test:iphone17air     # 104 integrity tests — iPhone 17 Air clickability (A–Z)
pnpm test:iphone17air:headed
pnpm test:all             # Vitest + smoke E2E (strict)
pnpm test:watch           # Vitest watch mode
```

First run only: install the browser binary with `pnpm exec playwright install chromium`.

## Layout

| Path | Type | What it covers |
|------|------|----------------|
| `tests/unit/backend/` | Unit | Auth, registry, Schrödinger validation/matrix, Palimpsest (Wayback CDX/timeline), scriptRunner |
| `tests/unit/frontend/` | Unit | FindingBadge, API token helpers, Shadow Diff (scan diffing) |
| `tests/integration/` | Integration | Express API via supertest (no real bash jobs) |
| `tests/e2e/` | Browser E2E | Playwright (Chromium): login, dashboard, Schrödinger scan + Palimpsest timeline |
| `tests/e2e/iphone-17-air-integrity.spec.ts` | Mobile integrity | **104** A→Z clickability/hit-target tests on iPhone 17 Air (420×912, touch) |
| `scripts/smoke-test.sh` | E2E | Full stack: health, jobs, SSE, Schrödinger scan |

## Environment

`tests/setup/env.ts` sets:

- `ARSENAL_API_TOKEN=test-token`
- `H4CK_ROOT` → parent `h4ck/` directory
- `PORT=0` for supertest (no fixed port bind)

## Notes

- Integration tests do **not** POST valid `moduleId` jobs (would run real bash scripts).
- E2E smoke test requires `dig`, `curl`, and running network for Schrödinger DNS phase.
- Playwright (`tests/e2e/`) boots the real backend + frontend via `webServer` (reuses a
  running instance if present) and uses token `ARSENAL_API_TOKEN` (default
  `dev-token-change-me`). The scan test hits live DNS + Wayback, so it is network-dependent.
