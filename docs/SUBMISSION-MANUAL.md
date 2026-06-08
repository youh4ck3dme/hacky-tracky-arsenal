# Manuál odovzdania — čo musíš urobiť ty

Centrálny checklist pre hackathon / Devpost. Technická časť (kód, `./start.sh`, smoke test) je hotová — tento dokument popisuje **iba manuálne kroky**, ktoré agent nemôže vykonať za teba.

**Jazyk:** SK inštrukcie · EN texty na copy-paste sú v [DEVPOST.md](DEVPOST.md)

---

## 0. Stav projektu

### Hotové (nemusíš programovať)

- [x] Backend + frontend (`./start.sh`)
- [x] `./scripts/preflight.sh` — deps + smoke test (8/8)
- [x] `./scripts/smoke-test.sh` — bez EADDRINUSE stack trace pri bežiacom backende
- [x] UI: Arsenal dashboard, SSE joby, Schrödinger Scan, Quantum Matrix
- [x] EN copy-paste texty v [DEVPOST.md](DEVPOST.md)
- [x] Pitch, demo script, screenshot/video guides

### Chýba (tvoja práca)

- [ ] 3× screenshot PNG v `docs/screenshots/`
- [ ] Demo video MP4 + upload URL
- [ ] Vyplnené placeholdery: Team, GitHub, Video URL v DEVPOST
- [ ] Odovzdanie na Devpost.com
- [ ] (Voliteľne) Git repo + verejný link

---

## 1. Timeline pred odovzdaním

| Kedy | Čo urobiť |
|------|-----------|
| **T-24 h** | `./scripts/preflight.sh` — musí skončiť `PREFLIGHT PASSED` |
| **T-2 h** | Pre-warm: AI job + Schrödinger scan na `example.com` (viď [DEMO-SCRIPT.md](DEMO-SCRIPT.md)) |
| **T-2 h** | Sprav 3 screenshoty (sekcia 2) |
| **T-1 h** | Nahraj demo video podľa [VIDEO-STORYBOARD.md](VIDEO-STORYBOARD.md) |
| **T-30 min** | Vyplni Devpost + nahraj assety (sekcia 4) |
| **T-0** | Live demo rehearsal — [DEMO-SCRIPT.md](DEMO-SCRIPT.md) |

---

## 2. Screenshoty (krok za krokom)

Detailný popis: [SCREENSHOTS.md](SCREENSHOTS.md) · Ulož sem: `docs/screenshots/`

### Príprava

```bash
cd h4ck/arsenal-pwa
./scripts/preflight.sh
./start.sh
```

1. Otvor http://127.0.0.1:5173
2. Prihlás sa tokenom z `.env` (default: `dev-token-change-me`)
3. Pre-warm: spusti AI job (Aktualizovať modul → AI/OSINT) a Schrödinger scan na `example.com` — nech dokončia

### Screenshot 1 — `01-arsenal-dashboard.png`

- [ ] Klikni tab **Arsenal** (vpravo hore)
- [ ] Viditeľných **5 kariet modulov** (Exploit, Web, Network, …)
- [ ] Aspoň jeden badge **ready** a jeden **partial**
- [ ] Dole viditeľný riadok **H4CK_ROOT**
- [ ] Navigácia **Arsenal | Schrödinger** vpravo hore
- macOS: **Cmd+Shift+4** → vyber okno prehliadača (1920×1080 alebo 1440×900)
- Ulož ako `docs/screenshots/01-arsenal-dashboard.png`

**Devpost caption (EN):** Arsenal PWA — 15 security tools, 5 categories, live install status.

### Screenshot 2 — `02-job-sse-logs.png`

- [ ] Klikni **Aktualizovať modul** na karte AI / OSINT (alebo inom module)
- [ ] Zachyť **Job modal počas behu** (nie až po dokončení)
- [ ] Progress bar čiastočne vyplnený
- [ ] Zelené/cyan log riadky v LogViewer
- [ ] Indikátor **● live** ak job beží
- Ulož ako `docs/screenshots/02-job-sse-logs.png`

**Devpost caption (EN):** Real-time SSE log stream during module update — no page refresh.

### Screenshot 3 — `03-schrodinger-quantum-matrix.png`

- [ ] Tab **Schrödinger**
- [ ] Scan `example.com` dokončený (alebo použij pre-warmed výsledok)
- [ ] Viditeľné **4 vantage stĺpce** (DNS, User-Agent, Network vs Web, Time · Palimpsest) + timeline slider
- [ ] Sekcia **Quantum Matrix** s aspoň jedným **amber Quantum** badge
- Ulož ako `docs/screenshots/03-schrodinger-quantum-matrix.png`

**Devpost caption (EN):** Schrödinger Scan — findings exist in superposition until observed from the right vantage.

### Checklist súborov

- [ ] `docs/screenshots/01-arsenal-dashboard.png` existuje
- [ ] `docs/screenshots/02-job-sse-logs.png` existuje
- [ ] `docs/screenshots/03-schrodinger-quantum-matrix.png` existuje
- [ ] Každý súbor < 5 MB, formát PNG

---

## 3. Demo video

Storyboard: [VIDEO-STORYBOARD.md](VIDEO-STORYBOARD.md)

### Nastavenie

| Parameter | Hodnota |
|-----------|---------|
| Rozlíšenie | 1920×1080, 16:9 |
| FPS | 30 |
| Formát | MP4 |
| Max veľkosť | 100 MB (Devpost limit) |
| Názov súboru | `hacky-tracky-arsenal-demo.mp4` |
| Nástroj | QuickTime (macOS) alebo OBS |

### Pre-nahrávanie

1. `./scripts/preflight.sh` — pass
2. `./start.sh` + login
3. **Pre-warm:** dokončený AI job + Schrödinger scan na `example.com` (shots 7–8 potrebujú hotové výsledky)

### 9 shotov (skrátene)

| Shot | Čas | Čo natočiť |
|------|-----|------------|
| 1 | 0–5s | Terminál: `./start.sh` |
| 2 | 5–12s | Login → Arsenal dashboard |
| 3 | 12–22s | AI modul → SSE logy scrollujú |
| 4 | 22–28s | Job hotový → Job History |
| 5 | 28–32s | Prepni tab → Schrödinger |
| 6 | 32–40s | Zadaj `example.com` → Scan → progress |
| 7 | 40–52s | DNS stĺpec — rôzne odpovede resolverov |
| 8 | 52–60s | Quantum Matrix — amber badge close-up |
| 9 | 60–65s | Tagline + repo cesta |

### EN voiceover (voliteľné, 1 veta na shot)

1. "Your pentest lab shouldn't live in a terminal."
2. "Hacky Tracky Arsenal — 15 tools, one dashboard."
3. "Live jobs. Real logs. SSE streaming."
4. "Full history. Lab ops, not chaos."
5. "But one scan isn't enough."
6. "Schrödinger Scan. Three vantage points."
7. "DNS resolvers disagree. That's signal, not noise."
8. "Quantum finding. Collapsed only when all observers agree."
9. "Observe before you exploit. Hacky Tracky Arsenal."

### Upload

- [ ] Export MP4
- [ ] Nahraj na **YouTube (unlisted)** alebo priamo do **Devpost**
- [ ] URL zapíš do [DEVPOST.md](DEVPOST.md) → sekcia **Fields to fill manually** → `Video URL`

---

## 4. Devpost — pole po poli

Otvor [devpost.com](https://devpost.com) → Submit project. Texty kopíruj z [DEVPOST.md](DEVPOST.md).

| Devpost pole | EN názov poľa | Odkiaľ skopírovať | Poznámka |
|--------------|---------------|-------------------|----------|
| Názov projektu | Project Name | DEVPOST § Project Name | — |
| Tagline | Elevator Pitch / Tagline | DEVPOST § Elevator Pitch | **max 200 znakov** |
| Inšpirácia | Inspiration | DEVPOST § Inspiration | celý odsek |
| Čo to robí | What it does | DEVPOST § What it does | oba podnadpisy |
| Ako sme to stavali | How we built it | DEVPOST § How we built it | — |
| Výzvy | Challenges | DEVPOST § Challenges | — |
| Úspechy | Accomplishments | DEVPOST § Accomplishments | — |
| Čo sme sa naučili | What we learned | DEVPOST § What we learned | — |
| Ďalej | What's next | DEVPOST § What's next | — |
| Built with | Built with / Technologies | DEVPOST § Tags | React, Node.js, TypeScript, … |
| Hackathon track | Built for FIND EVIL! | DEVPOST § Built for FIND EVIL! | + authorized use disclaimer |
| Ako vyskúšať | Try it out | DEVPOST § Try it out | + **GitHub URL** (doplníš) |
| Video | Demo video | nahraný MP4 alebo YouTube URL | **ty nahraješ** |
| Obrázky | Images / Gallery | 3× PNG z `docs/screenshots/` | **ty nahraješ** + captions z DEVPOST § Screenshots |

### Placeholdery — doplni v DEVPOST pred copy-paste

```text
Team members:     youh4ck3dme
GitHub URL:       https://github.com/youh4ck3dme/hacky-tracky-arsenal
Video URL:        https://youtube.com/watch?v=...   alebo Devpost upload
License:          MIT
```

---

## 5. Pitch deck (live prezentácia)

Ak prezentuješ na stage (nie len Devpost):

- Text slidov + speaker notes: [HACKATHON-PITCH.md](HACKATHON-PITCH.md)
- 6 slidov × ~10 s = 60 s pitch
- **Export manuálne:** skopíruj do Google Slides / Keynote / Canva → PDF
- Agent nemôže vytvoriť PPTX za teba

---

## 6. Git / verejný repo (voliteľné)

Workspace môže byť bez git. Ak Devpost vyžaduje **link na kód**:

```bash
cd /cesta/k/h4ck   # alebo arsenal-pwa
git init
git add .
git commit -m "Hacky Tracky Arsenal PWA with Schrödinger Scan"
git branch -M main
git remote add origin https://github.com/youh4ck3dme/hacky-tracky-arsenal.git
git push -u origin main
```

Potom URL zapíš do DEVPOST → **GitHub URL** a do Devpost poľa **Try it out**.

---

## 7. Finálny checklist pred Submit

### Technické

- [ ] `./scripts/preflight.sh` → `PREFLIGHT PASSED`
- [ ] `./start.sh` beží, http://127.0.0.1:5173 otvorené

### Assety

- [ ] `01-arsenal-dashboard.png`
- [ ] `02-job-sse-logs.png`
- [ ] `03-schrodinger-quantum-matrix.png`
- [ ] `hacky-tracky-arsenal-demo.mp4` nahrané
- [ ] Video URL zapísané v DEVPOST

### Devpost formulár

- [ ] Všetky textové sekcie skopírované z DEVPOST.md
- [ ] Team / License doplnené
- [ ] GitHub URL doplnené (ak máš repo)
- [ ] 3 screenshoty nahrané s EN captions
- [ ] Demo video nahrané alebo link

### Demo / etika

- [ ] Live demo 1× prejdené podľa [DEMO-SCRIPT.md](DEMO-SCRIPT.md)
- [ ] Prečítaný disclaimer: **Authorized use only** — scan len povolené ciele

---

## Súvisiace dokumenty

| Dokument | Účel |
|----------|------|
| [README.md](../README.md) | Rýchly štart, API, mapa docs |
| [LAB-WORKFLOW.md](LAB-WORKFLOW.md) | Denné lab použitie po hackathone |
| [DEVPOST.md](DEVPOST.md) | EN texty + placeholdery |
| [DEMO-SCRIPT.md](DEMO-SCRIPT.md) | 3-min live demo |
| [SCREENSHOTS.md](SCREENSHOTS.md) | Detail screenshotov |
| [VIDEO-STORYBOARD.md](VIDEO-STORYBOARD.md) | Video shot list |
| [HACKATHON-PITCH.md](HACKATHON-PITCH.md) | 60s pitch slides |
