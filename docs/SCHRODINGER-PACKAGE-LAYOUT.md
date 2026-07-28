# Schrödinger package layout (strangler)

Two directories are **intentional**, not accidental duplication.

## `backend/src/schrodinger/` — platform layer

Cross-cutting P0+ infrastructure and P2/P3 add-ons:

| Area | Modules |
|------|---------|
| Guardrails | `guardrails.ts`, `ssrf.ts` (pre-scan allowlist + IP policy) |
| Flags | `featureFlags.ts` |
| Persistence | `store.ts`, `memoryStore.ts`, `fileStore.ts`, `postgresStore.ts` |
| Audit | `auditLog.ts` |
| Domain types (extra) | `domain.ts` |
| DNS provider **interface** (legacy P0 stubs) | `dnsProvider.ts`, thin `digDnsProvider` / `mockDnsProvider` |
| P2/P3 | `watch/`, `palimpsestV2.ts`, `toolBridge.ts`, `pushNotifier.ts`, `triage/`, `vantage/`, `telemetry/` |

Public barrel: **`backend/src/schrodinger/index.ts`**

## `backend/src/services/schrodinger/` — runtime engine

Active scan pipeline used by HTTP routes:

| Area | Modules |
|------|---------|
| Orchestrator | `scanner.ts` (export `schrodingerScanner`) |
| DNS P1 | `dns/` dig + mock + DoH + pool + factory |
| Probes | `probes/userAgent.ts`, `probes/netweb.ts` |
| Rules | `rules/engine.ts` + `shared/schrodinger-rules.json` |
| Connect SSRF | `ssrf.ts` (`assertSafeConnectTargets` after resolve) |
| Time | `timeVantage.ts` |

Compat shims:

- `backend/src/services/schrodingerScanner.ts` → re-exports `scanner.js`
- `backend/src/services/schrodingerMatrix.ts` → re-exports rules engine

## Import rules

1. **Routes / app** → `routes/schrodinger.ts` + platform `schrodinger/*` for flags/audit.
2. **Scan execution** → only `services/schrodinger/scanner` (via shim OK).
3. Prefer **`services/schrodinger/dns/*`** for real multi-record DNS; platform dig/mock stubs stay for interface tests only.
4. New features: platform concerns under `src/schrodinger/`, probe/runtime under `src/services/schrodinger/`.

## Local infra

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis
# SCHRODINGER_POSTGRES_URL=postgres://schrodinger:schrodinger_dev_pass@127.0.0.1:5432/schrodinger
```

Migrations: `backend/src/db/migrations/`.
