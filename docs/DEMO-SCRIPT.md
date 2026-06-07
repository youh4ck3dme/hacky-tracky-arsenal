# Live Demo Script (~3 min)

**Prerequisites:** `./start.sh` running, browser at http://127.0.0.1:5173, API token from `.env`

| Step | Time | Action | What to say |
|------|------|--------|-------------|
| 0 | 0:00 | Terminal: `./start.sh` | "One command starts backend + frontend." |
| 1 | 0:15 | Browser → login with API token | "Localhost-only, bearer auth — lab tool, not a public weapon." |
| 2 | 0:30 | **Arsenal tab** — show 5 module cards | "15 tools, 5 categories — replaced our bash menu." |
| 3 | 0:45 | Expand one module → tool list with git commits | "Live status from real repos on disk." |
| 4 | 1:00 | Click **Aktualizovať modul → AI / OSINT** | "Whitelisted script only — `ai-tools.sh`." |
| 5 | 1:05 | Job modal — point at **live SSE logs** + progress | "Watch git pull in real time. No refresh." |
| 6 | 1:30 | Job completes → **Hotovo — obnoviť stav** | "Status refresh. Job lands in history panel." |
| 7 | 1:45 | Scroll to **Job History** — click a past job | "Full audit trail for lab ops." |
| 8 | 2:00 | Switch tab → **Schrödinger** | "Now the wow — observer-dependent recon." |
| 9 | 2:05 | Enter `example.com` → **Scan** | "One target. Three vantage points." |
| 10 | 2:15 | Point at progress bar during DNS phase | "30 resolvers from our 17k list." |
| 11 | 2:30 | **3 Vantage Columns** appear | "DNS, User-Agent, Network vs Web — side by side." |
| 12 | 2:45 | **Quantum Matrix** — amber Quantum badges | "Disagreement = real risk signal." |
| 13 | 2:55 | Optional: PWA Install mention | "Pin to home screen. Offline arsenal status." |
| 14 | 3:00 | Close | "Observe before you exploit. Thank you." |

## Backup plans

- **AI job slow:** Pre-run AI module before demo; show history + jump to Schrödinger.
- **DNS slow:** Use `example.com` only. Avoid `google.com` (rate limits).

## Pre-warm (recommended before live demo)

Schrödinger DNS fáza trvá ~30–90 s (30 sekvenčných `dig` volaní). Pre 3-min live demo **nevychádzaj z cold startu**.

1. **~5 min pred prezentáciou:** spusti `./scripts/preflight.sh` (overí deps + smoke test)
2. **~3 min pred:** `./start.sh`, login tokenom, spusti **AI job** a nechaj dokončiť
3. **~2 min pred:** Schrödinger tab → scan `example.com` → nechaj dokončiť (matrix + 3 vantage columns)
4. **Na stage:**
   - Ukáž hotový Quantum Matrix a Job History (completed výsledky)
   - Spusti nový AI job alebo Schrödinger scan len na **live progress** (`● live`, progress bar)
   - Backup: ak scan nestihne, ukáž pred-warmed completed scan a vysvetli 3 vantage points

Automatický pre-warm check: `./scripts/preflight.sh` (musí skončiť `ALL SMOKE TESTS PASSED`).

## Quick pre-demo checklist

- [ ] `./scripts/preflight.sh` passed
- [ ] `./start.sh` running
- [ ] `.env` has `ARSENAL_API_TOKEN`
- [ ] `dig` available in PATH (Schrödinger DNS)
- [ ] `h4ck/resolvers/resolvers.txt` exists
- [ ] Browser tab open at http://127.0.0.1:5173, token in sessionStorage (or auth modal ready)
- [ ] Pre-warmed: completed AI job + Schrödinger scan on `example.com` (optional but recommended)
