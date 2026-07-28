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
2. Scan trvá ~1–2 min (DNS 30 resolverov + UA + port probe)
3. **Quantum Matrix** = rozpor medzi vantage points → priorita pre manuálnu verifikáciu
4. **Collapsed** = všetci pozorovatelia súhlasia
5. **Absent** = nedetegované / timeout

## Večer — ukončenie

1. Ctrl+C v termináli kde beží `./start.sh`
2. Voliteľne pred ďalším dňom: `./scripts/smoke-test.sh` (rýchly API check)

## Riešenie problémov

| Problém | Riešenie |
|---------|----------|
| `pnpm install failed` / esbuild | Skontroluj `pnpm-workspace.yaml` → `allowBuilds: esbuild: true`, potom `pnpm install` |
| Port 3847 obsadený | `lsof -ti :3847 \| xargs kill`, potom `./start.sh` |
| Frontend neotvorí 127.0.0.1:5173 | Vite binduje na `127.0.0.1` — nepoužívaj `localhost` ak proxy zlyhá |
| Schrödinger DNS prázdny | Over `dig` v PATH a `h4ck/resolvers/resolvers.txt` |
| Nesprávne heslo | Default panel heslo je `23513900` (`ARSENAL_PANEL_PASSWORD`); stále funguje aj `ARSENAL_API_TOKEN` |

## Súvisiace docs

- [Demo script](DEMO-SCRIPT.md) — 3-min prezentácia
- [Screenshot guide](SCREENSHOTS.md) — Devpost assets
- [Devpost copy](DEVPOST.md) — submission text
