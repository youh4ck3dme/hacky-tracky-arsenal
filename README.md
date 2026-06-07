# Arsenal Control Panel PWA

Inštalovateľná webová aplikácia, ktorá nahrádza terminálové menu `hacky-admin-menu.sh` — dashboard 5 kategórií arzenálu, live status nástrojov, job queue so streamom logov, offline cache a Schrödinger Scan recon modul.

## Požiadavky

- Node.js 20+, pnpm
- bash, git, dig (pre Schrödinger DNS vantage)
- Arsenal root musí obsahovať `hacky-admin-menu.sh`

## Rýchly štart

```bash
cd h4ck/arsenal-pwa
cp .env.example .env          # uprav ARSENAL_API_TOKEN
./start.sh                    # alebo: pnpm install && pnpm run dev
```

- Frontend: http://127.0.0.1:5173
- Backend API: http://127.0.0.1:3847

Pri prvom otvorení zadaj `ARSENAL_API_TOKEN` z `.env` do auth modalu.

Pred demo alebo lab session:

```bash
./scripts/preflight.sh   # kontrola závislostí + smoke test
```

Bežné lab použitie: [docs/LAB-WORKFLOW.md](docs/LAB-WORKFLOW.md)

## Testy

```bash
pnpm test              # unit + integration (~5 s)
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
| `ARSENAL_API_TOKEN` | `dev-token-change-me` | Bearer token pre API |
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

## Schrödinger Scan (hackathon MVP)

> „CVE nie je fakt — je superpozícia, kým ju nezměříš z správneho uhla.“

Záložka **Schrödinger** v UI — jeden target, 3 vantage points:

1. **DNS** — vzorka 30 resolverov z `h4ck/resolvers/resolvers.txt`
2. **User-Agent** — Chrome, Googlebot, curl HTTP fingerprint
3. **Network vs Web** — TCP port probe + HTTP path fingerprint

Findingy: `collapsed` (všetci súhlasia), `quantum` (rozpor), `absent` (nedetegované).

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
# Frontend statiku servuj z frontend/dist
```
