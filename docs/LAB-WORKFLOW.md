# Lab Workflow — Daily Use

Praktický návod na používanie Arsenal PWA v pentest labe (nie len na hackathon demo).

## Ráno — štart session

```bash
cd h4ck/arsenal-pwa
./scripts/preflight.sh    # deps + smoke test (~30 s)
./start.sh                # backend :3847 + frontend :5173
```

Otvor http://127.0.0.1:5173 a prihlás sa tokenom z `.env`.

## Počas dňa — typické úlohy

| Úloha | Kde v UI | Poznámka |
|-------|----------|----------|
| Skontrolovať stav nástrojov | **Arsenal** tab | 5 modulov, git commit / installed badge |
| Aktualizovať modul (git pull) | **Aktualizovať modul** na karte | Whitelisted skript; sleduj SSE logy v modale |
| Audit minulých operácií | **Job History** | Klikni job pre detail + logy |
| Recon jedného cieľa | **Schrödinger** tab | Len ciele s povolením; target napr. `example.com` |
| Offline stav arzenálu | PWA nainštalovaná | Posledný cached status z IndexedDB |

## Schrödinger Scan — prakticky

1. Zadaj doménu (nie IP) — napr. vlastný lab target
2. Scan trvá ~1–2 min live (DNS sample + UA + port probe); mock path v CI &lt; 3s
3. **Quantum Matrix** = rules-as-data klasifikácia + **risk_score 0–100**
4. **Collapsed** = všetci pozorovatelia súhlasia
5. **Absent** = nedetegované / timeout
6. Stĺpce ukazujú counts (coll/qnt/tmp/abs) a score badge

## Schrödinger P1

### FEATURE_* flags (`GET /api/schrodinger/flags`)

| Flag | Env | Default | Význam |
|------|-----|---------|--------|
| `schrodinger.guardrails` | `FEATURE_schrodinger_guardrails` | `true` | Allowlist + SSRF + concurrency |
| `schrodinger.persist.postgres` | `FEATURE_schrodinger_persist_postgres` | `false` | Postgres store (stub) |
| `schrodinger.v2_providers` | `FEATURE_schrodinger_v2_providers` | `true` | Dig/Mock multi-record DNS; `false` → force mock |

### Env flags (runtime)

| Premenná | Default | Význam |
|----------|---------|--------|
| `SCHRODINGER_SCAN_MODE` | `live` | `mock` = celý scan z fixtures (CI/demo) |
| `SCHRODINGER_DNS_MODE` | `auto` | `auto` \| `dig` \| `mock` |
| `SCHRODINGER_ALLOWLIST` | `*` | canonical allowlist (`*` / domény / `*.suffix`) |
| `SCHRODINGER_TARGET_ALLOWLIST` | — | alias pre `SCHRODINGER_ALLOWLIST` |
| `SCHRODINGER_VANTAGES` | `dns,ua,netweb,time` | per-vantage on/off |
| `SCHRODINGER_PORT_PROFILE` | `quick` | `quick` \| `web` |
| `SCHRODINGER_DOH` | off | `1` = DoH 2. názor (nie namiesto dig) |
| `SCHRODINGER_DNS_SAMPLE` | `30` | počet resolverov |
| `SCHRODINGER_DNS_CONCURRENCY` | `6` | parallel dig pool |
| `SCHRODINGER_MAX_CONCURRENT` | `3` | max paralelné scany |
| `SCHRODINGER_SCAN_START_DELAY_MS` | `0` | test-only cancel window (CI mock) |

### DNS providery

- **DigDnsProvider** — multi-record, pool, fail per-resolver, consistency score, split-horizon
- **MockDnsProvider** — keď dig chýba (`auto`) alebo `SCHRODINGER_DNS_MODE=mock` / `SCHRODINGER_SCAN_MODE=mock`
- Resolvery: `H4CK_ROOT/resolvers/resolvers.txt` → fallback `1.1.1.1`, `8.8.8.8`, `9.9.9.9`

### Mock lab targets

| Target | Čo uvidíš |
|--------|-----------|
| `example.com` | collapsed DNS + mock timeline ghost |
| `quantum.example.com` | split-horizon + UA divergence → vysoký risk |
| `open-no-http.example.com` | port open / HTTP silent |
| `silent.example.com` | absent signály |

### GCP path

1. GCE / Cloud Shell: `apt-get install -y dnsutils` (alebo ekvivalent)
2. `SCHRODINGER_DNS_MODE=auto` (dig) alebo `mock` bez sieťových závislostí
3. `SCHRODINGER_ALLOWLIST` na tvoje lab domény (nie `*` v zdieľanom env)
4. Backend ostáva na `127.0.0.1` — reverse proxy + TLS ak treba vzdialený prístup

### UI changelog

Pozri [tests/fixtures/schrodinger/CHANGELOG-UI.md](../tests/fixtures/schrodinger/CHANGELOG-UI.md).

## Večer — ukončenie

1. Ctrl+C v termináli kde beží `./start.sh`
2. Voliteľne pred ďalším dňom: `./scripts/smoke-test.sh` (rýchly API check)

## Riešenie problémov

| Problém | Riešenie |
|---------|----------|
| ESLint IDE: `Could not find config file` | Root má `eslint.config.mjs` (flat). Spusti `pnpm install`, reload IDE window. Extension má preferovať workspace ESLint (nie global `/opt/homebrew/...`). |
| `pnpm install failed` / esbuild | Skontroluj `pnpm-workspace.yaml` → `allowBuilds: esbuild: true`, potom `pnpm install` |
| Port 3847 obsadený | `lsof -ti :3847 \| xargs kill`, potom `./start.sh` |
| Frontend neotvorí 127.0.0.1:5173 | Vite binduje na `127.0.0.1` — nepoužívaj `localhost` ak proxy zlyhá |
| Schrödinger DNS prázdny | Over `dig` v PATH a `h4ck/resolvers/resolvers.txt`; alebo `SCHRODINGER_DNS_MODE=mock` |
| dig chýba (strict dig) | `SCHRODINGER_DNS_MODE=auto` (fallback mock) alebo nainštaluj dnsutils |
| Allowlist deny | Pridaj doménu do `SCHRODINGER_ALLOWLIST` alebo nastav `*` |
| SSRF block | Resolvovaná IP je privátna/metadata — target nie je safe na connect |
| Nesprávne heslo | Default panel heslo je `23513900` (`ARSENAL_PANEL_PASSWORD`); stále funguje aj `ARSENAL_API_TOKEN` |

## Súvisiace docs

- [Schrödinger P0 architecture](SCHRODINGER-20-P0.md)
- [Schrödinger API draft](SCHRODINGER-API-DRAFT.md)
- [OpenAPI 3.0 draft](openapi.yaml)
- [UI changelog (P1)](../tests/fixtures/schrodinger/CHANGELOG-UI.md)
- [Demo script](DEMO-SCRIPT.md) — 3-min prezentácia
- [Screenshot guide](SCREENSHOTS.md) — Devpost assets
- [Devpost copy](DEVPOST.md) — submission text
