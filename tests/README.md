# Test suite

Automated tests for Arsenal PWA — unit, integration API, and bash E2E smoke.

## Commands

```bash
cd h4ck/arsenal-pwa
pnpm test              # Vitest: unit + integration (~5 s)
pnpm test:unit         # Unit tests only
pnpm test:integration  # API integration only
pnpm test:e2e          # Bash smoke-test (AI job + Schrödinger, ~30–60 s)
pnpm test:all          # Vitest + smoke E2E (strict)
pnpm test:watch        # Vitest watch mode
```

## Layout

| Path | Type | What it covers |
|------|------|----------------|
| `tests/unit/backend/` | Unit | Auth, registry, Schrödinger validation/matrix, scriptRunner |
| `tests/unit/frontend/` | Unit | FindingBadge, API token helpers |
| `tests/integration/` | Integration | Express API via supertest (no real bash jobs) |
| `scripts/smoke-test.sh` | E2E | Full stack: health, jobs, SSE, Schrödinger scan |

## Environment

`tests/setup/env.ts` sets:

- `ARSENAL_API_TOKEN=test-token`
- `H4CK_ROOT` → parent `h4ck/` directory
- `PORT=0` for supertest (no fixed port bind)

## Notes

- Integration tests do **not** POST valid `moduleId` jobs (would run real bash scripts).
- E2E smoke test requires `dig`, `curl`, and running network for Schrödinger DNS phase.
