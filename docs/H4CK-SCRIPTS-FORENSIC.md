# H4CK scripts forensic (2026-07-28)

## Goal
Locate real `network-tools.sh`, `exploit-tools.sh`, `web-hacking.sh`, `malware-tools.sh`, `ai-tools.sh`, `full-install.sh`, `hacky-admin-menu.sh` for `H4CK_ROOT`.

## Proven former location (Cursor evidence)
Scripts **existed** and were read by Cursor at:

```
/Users/erikbabcan/h4ck-unzipped/h4ck/hacky-admin-menu.sh
/Users/erikbabcan/h4ck-unzipped/h4ck/full-install.sh
/Users/erikbabcan/h4ck-unzipped/h4ck/web-hacking.sh
/Users/erikbabcan/h4ck-unzipped/h4ck/network-tools.sh
/Users/erikbabcan/h4ck-unzipped/h4ck/ai-tools.sh
/Users/erikbabcan/h4ck-unzipped/h4ck/malware-tools.sh
/Users/erikbabcan/h4ck-unzipped/h4ck/exploit-tools.sh
/Users/erikbabcan/h4ck-unzipped/h4ck/hacky-tracky-admin-pack.zip
/Users/erikbabcan/h4ck-unzipped/h4ck/arsenal-pwa/   ← later moved/cloned as hacky-tracky-arsenal
```

Cursor project still exists: `~/.cursor/projects/Users-erikbabcan-h4ck-unzipped-h4ck-arsenal-pwa`  
**Disk tree `/Users/erikbabcan/h4ck-unzipped` is GONE.**

## Current on disk
Only **stubs** (~250 B each) from 2026-07-28 at `/Users/erikbabcan/h4ck/` (not the original arsenal).

## GitHub (youh4ck3dme/hacky-tracky-arsenal)
- Remote branches: **`main` only** (no deleted remote branches found with scripts)
- Git history never contained real module `.sh` files — only:
  - `scripts/preflight.sh`, `scripts/smoke-test.sh`, `start.sh`
  - `tests/fixtures/h4ck-stub/*` (CI stub)
- Code search for `network-tools.sh` → only **registry references**, not file bodies
- Related repos checked (no real scripts):
  - `kali-h4ck3d-live`, `h4ck3d-enterprise`, `pwa-shieldops`, `OptimusCyberPrime`, `maintenance-suite`, `zip-pwa-factory`, `black-jarvis` (empty)
- Other accounts:
  - `ENZO7700/H4CK3down.sh` — single different cyber bash script, not the arsenal modules
  - `you640/h4ck3d-suite-angular-pwa` — no matching `.sh`

## Architecture note (README)
`H4CK_ROOT` is **outside** the PWA repo by design: parent `h4ck/` with menu + modules. PWA never vendored the real scripts into git (security / size).

## Next recovery targets
1. USB / external (transcripts mention maXtor 4T wordlists)
2. iCloud `#TOP h4ck3d`
3. VPS: `tapfast` / `fantastic4` (`~/.ssh/config`)
4. Any remaining `hacky-tracky-admin-pack.zip` backup
5. Time Machine if enabled

## This branch
`recover/h4ck-scripts-forensic` — **keep open**; do not delete until scripts are restored.

## Recovery update (2026-07-28 later)

Recovered **real module scripts** (post-refactor with `_arsenal-sync.sh`) from Cursor agent transcript:
`~/.cursor/projects/Users-erikbabcan-h4ck-unzipped/agent-transcripts/a9172686-...`

| File | Source |
|------|--------|
| `_arsenal-sync.sh` | Write tool in transcript |
| `network-tools.sh` | masscan, zmap, bettercap |
| `exploit-tools.sh` | exploitdb, LinEnum, PEASS-ng |
| `web-hacking.sh` | SecLists, wpscan, WEF optional |
| `malware-tools.sh` | theZoo, SET, zphisher |
| `ai-tools.sh` | resolvers, pyWhat, AI-Hacking-Tools |
| `full-install.sh` | runs all modules |
| `start-lab.sh` | launches arsenal-pwa dev-all |
| `hacky-admin-menu.sh` | **reconstructed** menu launcher (original body not in transcript Writes; only Read redacted) |

Restored live to: `/Users/erikbabcan/h4ck/`  
Reference copy in this branch: `docs/recovered-h4ck/`

Set:
```bash
export H4CK_ROOT=/Users/erikbabcan/h4ck
```
