#!/usr/bin/env bash
# HACKY TRACKY ADMIN PANEL — best public GitHub stack (2026)
set -euo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"

banner() {
  cat <<'B'
╔══════════════════════════════════════════════╗
║  HACKY TRACKY — Best Public Arsenal Stack    ║
╚══════════════════════════════════════════════╝
B
}

run_mod() { bash "$H4CK_ROOT/$1"; }

if [[ "${1:-}" == "--non-interactive" ]] || [[ ! -t 0 ]]; then
  banner
  echo "Modules: exploit | web | network | malware | ai | full"
  exit 0
fi

banner
PS3=$'\nVyber modul: '
options=(
  "Exploit (PEASS + LinEnum + Impacket)"
  "Web (SecLists + nuclei + ffuf)"
  "Network (masscan + bettercap + nmap)"
  "Analysis (theZoo + gitleaks + trivy)"
  "OSINT (sherlock + theHarvester + amass)"
  "Full install"
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
