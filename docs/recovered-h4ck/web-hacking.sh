#!/usr/bin/env bash
set -uo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"
# shellcheck source=_arsenal-sync.sh
source "$H4CK_ROOT/_arsenal-sync.sh"

echo "🌐 Spúšťam modul: Web Hacking"
echo "   Top public: SecLists · nuclei · ffuf · sqlmap (opt)"

require_sync SecLists https://github.com/danielmiessler/SecLists
require_sync nuclei https://github.com/projectdiscovery/nuclei
require_sync ffuf https://github.com/ffuf/ffuf
require_sync_optional sqlmap https://github.com/sqlmapproject/sqlmap
require_sync_optional wpscan https://github.com/wpscanteam/wpscan

echo ""
echo "🔍 INTEGRITY CHECK:"
[ -d "SecLists" ] && echo "✅ SecLists" || { echo "❌ SecLists"; ARSENAL_SYNC_FAIL=1; }
[ -d "nuclei" ] && echo "✅ nuclei" || { echo "❌ nuclei"; ARSENAL_SYNC_FAIL=1; }
[ -d "ffuf" ] && echo "✅ ffuf" || { echo "❌ ffuf"; ARSENAL_SYNC_FAIL=1; }
[ -d "sqlmap" ] && echo "✅ sqlmap (optional)" || echo "⚠ sqlmap skipped"
[ -d "wpscan" ] && echo "✅ WPScan (optional)" || echo "⚠ WPScan skipped"

echo "---"
if [ "$ARSENAL_SYNC_FAIL" -eq 0 ]; then
  echo "🚀 Web modul pripravený. Build: cd nuclei && go build; cd ffuf && go build"
else
  echo "❌ Web modul má chyby."
fi
exit "$ARSENAL_SYNC_FAIL"
