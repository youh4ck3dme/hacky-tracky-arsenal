# Arsenal Control Panel PWA

Inštalovateľná webová aplikácia, ktorá nahrádza terminálové menu `hacky-admin-menu.sh` — dashboard 5 kategórií arzenálu, live status nástrojov, job queue so streamom logov, offline cache a Schrödinger Scan recon modul.

## Repository

- **GitHub:** https://github.com/youh4ck3dme/hacky-tracky-arsenal
- **License:** MIT

```bash
git clone https://github.com/youh4ck3dme/hacky-tracky-arsenal.git
cd hacky-tracky-arsenal
cp .env.example .env
./start.sh
```

`H4CK_ROOT` v `.env` musí ukazovať na rodičovský `h4ck/` arzenál (obsahuje `hacky-admin-menu.sh`, `resolvers/`). Pri clone vedľa existujúceho `h4ck/` stačí default `../`.

## Požiadavky

- Node.js 20+, pnpm
- bash, git; `dig` odporúčaný pre live DNS vantage (mock fallback ak chýba)
- Arsenal root musí obsahovať `hacky-admin-menu.sh`

## Rýchly štart

```bash
cd h4ck/arsenal-pwa
cp .env.example .env          # uprav ARSENAL_API_TOKEN
./start.sh                    # alebo: pnpm install && pnpm run dev
```

- Frontend: http://127.0.0.1:5173
- Backend API: http://127.0.0.1:3847

Pri prvom otvorení zadaj **panelové heslo** (default `23513900`, env `ARSENAL_PANEL_PASSWORD`) — funguje rovnako ako API token.

Pred demo alebo lab session:

```bash
./scripts/preflight.sh   # kontrola závislostí + smoke test
```

Bežné lab použitie: [docs/LAB-WORKFLOW.md](docs/LAB-WORKFLOW.md)

## Testy

```bash
pnpm test              # unit + integration (~5 s)
pnpm lint              # ESLint flat config (eslint.config.mjs)
pnpm test:e2e          # smoke API + AI job + Schrödinger (~30–60 s)
pnpm test:all          # Vitest + smoke E2E (ostré)
```

Detail: [tests/README.md](tests/README.md)

## Dokumentácia

| Súbor | Kedy otvoriť |
|-------|--------------|
| [docs/SUBMISSION-MANUAL.md](docs/SUBMISSION-MANUAL.md) | **Hackathon / Devpost** — čo musíš urobiť ty (screenshoty, video, upload) |
| [docs/LAB-WORKFLOW.md](docs/LAB-WORKFLOW.md) | Denné použitie v labe (štart, joby, Schrödinger, troubleshooting) |
| [docs/DEVPOST.md](docs/DEVPOST.md) | Hotové EN texty na copy-paste do Devpost |
| [docs/HACKATHON-PITCH.md](docs/HACKATHON-PITCH.md) | 60s pitch — 6 slidov + speaker notes |
| [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md) | 3-min live demo + pre-warm |
| [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) | Detailný návod na 3 screenshoty |
| [docs/VIDEO-STORYBOARD.md](docs/VIDEO-STORYBOARD.md) | Storyboard demo videa (60–90 s) |
| [docs/screenshots/](docs/screenshots/) | Sem ulož PNG pred odovzdaním |

Technické detaily (API, `.env`, PWA) sú v tomto README nižšie.

## Čo musím urobiť ja (hackathon)

Automaticky hotové: `./start.sh`, `./scripts/preflight.sh`, smoke test, UI, EN texty v `docs/DEVPOST.md`.

**Ty musíš manuálne** (kompletný postup: [docs/SUBMISSION-MANUAL.md](docs/SUBMISSION-MANUAL.md)):

1. Doplniť **Team**, **GitHub URL**, **Video URL** v [docs/DEVPOST.md](docs/DEVPOST.md)
2. Urobiť a uložiť **3 screenshoty** do `docs/screenshots/`
3. Nahrať **demo video** (60–90 s MP4) a zapísať link
4. Skopírovať texty z DEVPOST na **Devpost.com**
5. (Voliteľne) **git init + push** ak potrebuješ verejný repo link

## Premenné prostredia (`.env`)

| Premenná | Default | Popis |
|----------|---------|-------|
| `ARSENAL_API_TOKEN` | `dev-token-change-me` | Bearer token pre API (voliteľné / advanced) |
| `ARSENAL_PANEL_PASSWORD` | `23513900` | Jednoduché heslo do UI (AuthGate) |
| `H4CK_ROOT` | auto (`../` od arsenal-pwa) | Cesta k `h4ck/` arzenálu |
| `PORT` | `3847` | Backend port |
| `HOST` | `127.0.0.1` | Bind adresa (lab-only) |

## API

| Metóda | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/health` | nie |
| GET | `/api/modules` | áno |
| GET | `/api/arsenal/status` | áno |
| POST | `/api/jobs` | áno |
| GET | `/api/jobs` | áno |
| GET | `/api/jobs/:id` | áno |
| GET | `/api/jobs/:id/stream` | áno (SSE) |
| POST | `/api/jobs/:id/cancel` | áno |
| POST | `/api/schrodinger/scans` | áno |
| GET | `/api/schrodinger/scans/:id` | áno |
| GET | `/api/schrodinger/scans/:id/stream` | áno (SSE) |

## Schrödinger Scan (P1)

> „CVE nie je fakt — je superpozícia, kým ju nezměříš z správneho uhla.“

Záložka **Schrödinger** v UI — jeden target, 4 vantage points (3× *kde* + 1× *kedy*), **risk_score 0–100**, Quantum Matrix rules-as-data:

1. **DNS** (`DigDnsProvider` / `MockDnsProvider`) — multi-record (A/AAAA/CNAME/MX/TXT/NS), sample N resolverov z `H4CK_ROOT/resolvers/resolvers.txt` (fallback 1.1.1.1/8.8.8.8/9.9.9.9), parallel pool + timeout/retry/jitter, **consistency score**, split-horizon → quantum. DoH (Google/Cloudflare) voliteľne ako 2. názor.
2. **User-Agent** — Chrome, Chrome mobile, Googlebot, curl, Safari iOS × paths (`/`, `/robots.txt`, `/wp-admin`, `/.well-known/security.txt`); status/redirects/server/length/title/**body hash** (bez raw cookies).
3. **Network vs Web** — port profile `quick` | `web` (nie full 65535), TCP + HTTP(S); quantum pri open port + no HTTP. Po DNS: **SSRF re-check** pred connect.
4. **Time · Palimpsest** — Wayback CDX timeline + ghost paths (temporal).

Findingy: `collapsed` | `quantum` | `temporal` | `absent`. Rules: `shared/schrodinger-rules.json` → severity, risk weight, `next_actions[]`.

**Guardrails:** `SCHRODINGER_ALLOWLIST` (+ alias `SCHRODINGER_TARGET_ALLOWLIST`) + SSRF IP block.  
**FEATURE_\*:** `schrodinger.guardrails` (on) · `persist.postgres` (off) · `v2_providers` (on).  
**Runtime:** `SCHRODINGER_VANTAGES`, `SCHRODINGER_DNS_MODE`, `SCHRODINGER_SCAN_MODE=mock|live`, `SCHRODINGER_MAX_CONCURRENT`.

**CI:** mock scan p95 &lt; 3s. Live dig na `example.com` soft target &lt; 90s. GCP: GCE/Cloud Shell s `dig`, alebo mock bez dig.  
**22/10 rule:** každý prompt končí zelenými testami + docs + flags (`.env.example`).

UI changelog: [tests/fixtures/schrodinger/CHANGELOG-UI.md](tests/fixtures/schrodinger/CHANGELOG-UI.md). Lab: [docs/LAB-WORKFLOW.md](docs/LAB-WORKFLOW.md#schrödinger-p1). P0: [docs/SCHRODINGER-20-P0.md](docs/SCHRODINGER-20-P0.md). API: [docs/SCHRODINGER-API-DRAFT.md](docs/SCHRODINGER-API-DRAFT.md).

> Attack surface nie je snapshot, je sediment. Palimpsest pridáva čas ako 4. uhol pozorovania — bez API kľúča, čisto cez verejné Wayback CDX.

### Shadow Diff — `git diff` pre attack surface

Každý dokončený scan sa uloží do IndexedDB ako baseline pre daný target. Pri ďalšom scane (napr. po reconnecte) sa porovná predošlý cached stav s novým:

- `+` nový signál (napr. quantum/temporal, ktorý pribudol)
- `−` signál, ktorý zanikol
- `~` vantage, ktorý zmenil headline stav (napr. `collapsed → quantum`)

Ak nastala zmena, PWA pošle notifikáciu do zariadenia („Lab target X sa zmenil — +2 nových signálov…"). Defenzívny monitoring bez SIEM ceny — diff pre *neistotu*, nie pre súbory.

## PWA — Add to Home Screen

1. Spusti `./start.sh` alebo `pnpm run dev`
2. Otvor frontend v Chrome/Safari
3. Prihlás sa API tokenom
4. **Chrome**: Install app / Add to Home Screen
5. **Safari (iOS)**: Share → Add to Home Screen

Offline režim zobrazí posledný cached stav arzenálu z IndexedDB.

## Bezpečnostné upozornenie

- **Určené výhradne pre lokálny pentest lab**
- Backend binduje na `127.0.0.1` — neexponuj verejne bez TLS
- Schrödinger scanuj len ciele, ktoré vlastníš alebo máš povolenie testovať
- Allowlist + SSRF IP block (žiadne connect na 10/8, 127/8, 169.254/16, …)
- Whitelisted bash skripty — žiadne arbitrary command execution

## Hackathon submission

**Štart tu:** [docs/SUBMISSION-MANUAL.md](docs/SUBMISSION-MANUAL.md) — timeline, screenshoty, video, Devpost pole po poli.

Materiály pre FIND EVIL! / Security track:

- [Manuál — čo urobiť ty](docs/SUBMISSION-MANUAL.md)
- [Lab workflow (daily use)](docs/LAB-WORKFLOW.md)
- [60s pitch deck](docs/HACKATHON-PITCH.md)
- [Devpost copy (EN)](docs/DEVPOST.md)
- [Live demo script](docs/DEMO-SCRIPT.md)
- [Screenshot guide](docs/SCREENSHOTS.md)
- [Video storyboard](docs/VIDEO-STORYBOARD.md)

Pred odovzdaním: `./scripts/preflight.sh` → screenshoty → video → Devpost Submit.

## Produkcia

```bash
pnpm run build
pnpm run start
# Frontend: Express servuje frontend/dist ak existuje (Docker / Cloud Run)
```

### Docker (Cloud Run ready)

```bash
docker build -t arsenal:local .
docker run --rm -p 8080:8080 \
  -e ARSENAL_API_TOKEN=dev-token-change-me \
  -e ARSENAL_PANEL_PASSWORD=23513900 \
  arsenal:local
```

### Local Postgres + Redis

```bash
docker compose -f docker-compose.dev.yml up -d
```

### GCP Terraform

```bash
cd infra && cp terraform.tfvars.example terraform.tfvars
# set project_id → terraform init && terraform apply
```

See [infra/README.md](infra/README.md) and [docs/SCHRODINGER-22-PLATFORM.md](docs/SCHRODINGER-22-PLATFORM.md).
