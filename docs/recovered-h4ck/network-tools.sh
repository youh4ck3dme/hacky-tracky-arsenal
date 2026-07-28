#!/usr/bin/env bash
set -uo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"
# shellcheck source=_arsenal-sync.sh
source "$H4CK_ROOT/_arsenal-sync.sh"

echo "📡 Spúšťam modul: Network Tools"
echo "   Top public: masscan · bettercap · nmap · zmap (opt)"

require_sync masscan https://github.com/robertdavidgraham/masscan
require_sync bettercap https://github.com/bettercap/bettercap
require_sync nmap https://github.com/nmap/nmap
require_sync_optional zmap https://github.com/zmap/zmap
require_sync_optional httpx https://github.com/projectdiscovery/httpx

echo "---"
if [ "$ARSENAL_SYNC_FAIL" -eq 0 ]; then
  echo "🚀 Network modul pripravený (masscan, bettercap, nmap)."
else
  echo "❌ Network modul má chyby."
fi
exit "$ARSENAL_SYNC_FAIL"
