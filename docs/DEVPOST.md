# Devpost Submission — Copy/Paste Ready

Kompletný manuál (screenshoty, video, timeline): [SUBMISSION-MANUAL.md](SUBMISSION-MANUAL.md)

---

## Fields to fill manually

Doplň pred copy-paste na Devpost.com:

```text
Team members:     youh4ck3dme
GitHub URL:       https://github.com/youh4ck3dme/hacky-tracky-arsenal
Video URL:
License:          MIT
```

| Pole | Tvoja hodnota |
|------|---------------|
| Team members | youh4ck3dme |
| GitHub URL | https://github.com/youh4ck3dme/hacky-tracky-arsenal |
| Video URL | |
| License | MIT |

Po doplnení skopíruj sekcie nižšie do príslušných polí na Devpost.

---

## Project Name

**Hacky Tracky Arsenal** — PWA Lab Control Panel with **Schrödinger Scan**

## Elevator Pitch (max 200 chars)

Installable PWA for pentest labs. Manage 15 security tools from your phone. Schrödinger Scan observes targets from 3 vantage points and classifies findings as collapsed, quantum, or absent.

---

## Inspiration

Security teams trust single-point scans. One `nmap`, one `curl`, one DNS lookup — one truth. But real attack surfaces are **observer-dependent**: CDN split horizons, bot-only content, geo-filtered ports. We asked: *what if a CVE exists only when measured from the right angle?* Schrödinger Scan was born. Arsenal PWA wraps our existing 15-tool bash arsenal into something you can run from a tablet in the field.

---

## What it does

### Arsenal Control Panel (PWA)

- Dashboard for 5 tool categories: Exploit, Web, Network, Malware, AI/OSINT
- Live status: installed / git commit / last updated
- One-click module updates via whitelisted bash scripts
- Job queue with SSE log streaming + progress bar
- Job history panel
- Offline mode: cached arsenal status via IndexedDB + Service Worker

### Schrödinger Scan (recon module)

- Input: one domain (e.g. `example.com`)
- **Vantage 1 — DNS:** 30 resolvers sampled from 17,000+ (`resolvers.txt`)
- **Vantage 2 — User-Agent:** Chrome, Googlebot, curl HTTP fingerprints
- **Vantage 3 — Network vs Web:** TCP probes (80,443,22,8080,8443) + HTTP paths (`/`, `/wp-admin`, `/robots.txt`)
- **Output:** Quantum Matrix — findings tagged `collapsed` | `quantum` | `absent`
- Live SSE progress during scan

---

## How we built it

- **Frontend:** React 19, Vite, Tailwind, PWA (vite-plugin-pwa), TypeScript
- **Backend:** Node.js, Express, SSE, dotenv, job queue with persistence
- **Security:** Bearer token auth, localhost bind, script whitelist (6 `.sh` files only), no arbitrary exec
- **Data:** `arsenal-registry.json` maps 15 repos to 6 modules; resolvers from Trickest list in `h4ck/resolvers/`
- **Monorepo:** pnpm workspaces, `./start.sh` one-command launch

---

## Challenges we ran into

- DNS vantage takes 30 sequential `dig` calls — balanced speed vs coverage with sampling
- Classifying "quantum" vs "collapsed" required cross-vantage heuristics (split DNS, UA divergence, port-open/HTTP-silent)
- PWA offline cache for API status while keeping install jobs online-only
- Job queue single-worker design to avoid parallel `git clone` collisions

---

## Accomplishments that we're proud of

- Turned a terminal bash menu into an installable PWA in one sprint
- Novel **observer-dependent recon** concept with live visualization
- End-to-end: dashboard → live job logs → Schrödinger matrix in one app
- Smoke-tested: AI module job, SSE streams, Schrödinger on `example.com` — all pass

---

## What we learned

- Single-vantage recon creates false confidence
- PWAs are viable for lab ops tools (offline status, Add to Home Screen)
- SSE beats polling for long-running security jobs

---

## What's next

- Palimpsest module: temporal attack-surface layers (Wayback + ghost paths)
- Schrödinger scan history + JSON export for reports
- DNS Grand Prix animation (resolver race visualization)
- Optional WPScan/masscan scan jobs (beyond install-only)

---

## Built for FIND EVIL!

FIND EVIL! asks builders to create defenders that respond in seconds. Schrödinger Scan is a **defender's observation layer**: it doesn't just find evil — it tells you **whether evil is real or an artifact of where you looked**. Arsenal is the operational backbone that keeps the lab ready.

**Authorized use only.** Scan targets you own or have written permission to test.

---

## Try it out

```bash
git clone https://github.com/youh4ck3dme/hacky-tracky-arsenal.git
cd hacky-tracky-arsenal
cp .env.example .env
./start.sh
# Frontend: http://127.0.0.1:5173
# Token: value from .env (default: dev-token-change-me)
# Set H4CK_ROOT in .env to your h4ck/ arsenal directory if not ../
```

---

## Tags

`pwa` `pentest` `recon` `dns` `security-tools` `find-evil` `nodejs` `react` `sse` `offline-first`

---

## Demo video

- **File:** `hacky-tracky-arsenal-demo.mp4` (60–90 s, 1080p)
- **Storyboard:** [docs/VIDEO-STORYBOARD.md](VIDEO-STORYBOARD.md)
- **Upload URL:** _(fill in [Fields to fill manually](#fields-to-fill-manually) → Video URL)_

Recording checklist:

- [ ] Terminal `./start.sh` (shot 1)
- [ ] Login + Arsenal dashboard pan (shots 2–3)
- [ ] Live AI job SSE logs (shot 3)
- [ ] Job history highlight (shot 4)
- [ ] Schrödinger tab + pre-warmed `example.com` matrix (shots 5–8)
- [ ] Closing tagline (shot 9)

---

## Screenshots

Capture into `docs/screenshots/` — see [SCREENSHOTS.md](SCREENSHOTS.md).

| File | Caption |
|------|---------|
| `docs/screenshots/01-arsenal-dashboard.png` | Arsenal PWA — 15 security tools, 5 categories, live install status. |
| `docs/screenshots/02-job-sse-logs.png` | Real-time SSE log stream during module update — no page refresh. |
| `docs/screenshots/03-schrodinger-quantum-matrix.png` | Schrödinger Scan — findings exist in superposition until observed from the right vantage. |

---

## Team / License

Vyplň v sekcii [Fields to fill manually](#fields-to-fill-manually) vyššie, potom sem skopíruj:

- **Team:** _(your name / team name)_
- **License:** MIT (or your repo license)
- **Authorized use:** Lab and authorized targets only. Not for unauthorized scanning.
