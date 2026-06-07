# Demo Video Storyboard (60–90 sec)

**Format:** 1080p, 16:9, MP4 under 100MB  
**Music:** Low-tempo dark synth (no vocals)

| Shot | Duration | Visual | Audio / VO |
|------|----------|--------|------------|
| 1 | 0–5s | Black screen → terminal `./start.sh` | "Your pentest lab shouldn't live in a terminal." |
| 2 | 5–12s | PWA login → Arsenal dashboard pan | "Hacky Tracky Arsenal — 15 tools, one dashboard." |
| 3 | 12–22s | Click AI module → logs scrolling fast | "Live jobs. Real logs. SSE streaming." |
| 4 | 22–28s | Job completes, history panel highlight | "Full history. Lab ops, not chaos." |
| 5 | 28–32s | Tab switch → Schrödinger | "But one scan isn't enough." |
| 6 | 32–40s | Type `example.com`, hit Scan, progress bar | "Schrödinger Scan. Three vantage points." |
| 7 | 40–52s | Zoom into DNS column — split answers | "DNS resolvers disagree. That's signal, not noise." |
| 8 | 52–60s | Quantum Matrix amber badge close-up | "Quantum finding. Collapsed only when all observers agree." |
| 9 | 60–65s | Logo + tagline + repo path | "Observe before you exploit. Hacky Tracky Arsenal." |

## Recording tools

- macOS: QuickTime Screen Recording or OBS
- Record at 1920×1080, 30fps
- Narrate live or add VO in post

## File naming

`hacky-tracky-arsenal-demo.mp4` → upload to Devpost + optional YouTube unlisted link

## Pre-recording setup

1. `./scripts/preflight.sh` — must pass
2. `./start.sh` + login at http://127.0.0.1:5173
3. **Pre-warm before recording:** complete AI job + Schrödinger scan on `example.com` (shots 6–8 need results; re-run scan on camera only for progress bar if time allows)
4. See [DEMO-SCRIPT.md](DEMO-SCRIPT.md) Pre-warm section

## Submission checklist

- [ ] MP4 exported at 1080p, under 100MB
- [ ] Upload URL added to [DEVPOST.md](DEVPOST.md) Demo video section
- [ ] 3 screenshots in `docs/screenshots/` per [SCREENSHOTS.md](SCREENSHOTS.md)
