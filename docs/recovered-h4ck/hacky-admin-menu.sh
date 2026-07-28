#!/usr/bin/env bash
# HACKY TRACKY ADMIN PANEL — terminal menu (recovered marker + module launcher)
# Original interactive UI body was not in git; modules recovered from Cursor session 2026-06.
set -euo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"

banner() {
  cat <<'B'
╔══════════════════════════════════════╗
║   HACKY TRACKY ADMIN PANEL           ║
╚══════════════════════════════════════╝
B
}

run_mod() {
  local s="$1"
  if [[ -f "$H4CK_ROOT/$s" ]]; then
    bash "$H4CK_ROOT/$s"
  else
    echo "Missing: $s" >&2
    return 1
  fi
}

if [[ "${1:-}" == "--non-interactive" ]] || [[ ! -t 0 ]]; then
  banner
  echo "Modules: exploit web network malware ai full"
  exit 0
fi

banner
PS3=$'\nVyber modul (číslo): '
options=(
  "Exploit Tools (exploit-tools.sh)"
  "Web Hacking (web-hacking.sh)"
  "Network Tools (network-tools.sh)"
  "Malware Tools (malware-tools.sh)"
  "AI / OSINT (ai-tools.sh)"
  "Full install (full-install.sh)"
  "Quit"
)
select opt in "${options[@]}"; do
  case $REPLY in
    1) run_mod exploit-tools.sh ;;
    2) run_mod web-hacking.sh ;;
    3) run_mod network-tools.sh ;;
    4) run_mod malware-tools.sh ;;
    5) run_mod ai-tools.sh ;;
    6) run_mod full-install.sh ;;
    7) break ;;
    *) echo "Neplatná voľba" ;;
  esac
done
