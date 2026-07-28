#!/usr/bin/env bash
set -uo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"
# shellcheck source=_arsenal-sync.sh
source "$H4CK_ROOT/_arsenal-sync.sh"

echo "📡 Spúšťam modul: Network Tools"
echo "   Core: masscan · bettercap · nmap"
echo "   ✨ WOW: chisel (TCP/UDP tunnel over HTTP) · NetExec (lateral / AD network exec)"

require_sync masscan https://github.com/robertdavidgraham/masscan
require_sync bettercap https://github.com/bettercap/bettercap
require_sync nmap https://github.com/nmap/nmap
# ✨ Pivot tunnel — ako frp, ale pentest-native
require_sync chisel https://github.com/jpillora/chisel
# ✨ Successor to CrackMapExec — network execution swiss army
require_sync NetExec https://github.com/Pennyw0rth/NetExec
require_sync_optional zmap https://github.com/zmap/zmap
require_sync_optional httpx https://github.com/projectdiscovery/httpx
require_sync_optional Coercer https://github.com/p0dalirius/Coercer

echo "---"
if [ "$ARSENAL_SYNC_FAIL" -eq 0 ]; then
  echo "🚀 Network OK · WOW tip: chisel server -p 8000 --reverse"
  echo "              nxc smb 10.0.0.0/24 -u user -p pass"
else
  echo "❌ Network modul má chyby."
fi
exit "$ARSENAL_SYNC_FAIL"
