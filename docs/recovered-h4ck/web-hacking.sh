#!/usr/bin/env bash
set -uo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"
# shellcheck source=_arsenal-sync.sh
source "$H4CK_ROOT/_arsenal-sync.sh"

echo "🌐 Spúšťam modul: Web Hacking"
echo "   Core: SecLists · nuclei · ffuf"
echo "   ✨ WOW: smuggler (HTTP Request Smuggling/Desync) · XSStrike (advanced XSS)"

require_sync SecLists https://github.com/danielmiessler/SecLists
require_sync nuclei https://github.com/projectdiscovery/nuclei
require_sync ffuf https://github.com/ffuf/ffuf
# ✨ Desync / smuggling — málokto to má v arzenáli
require_sync smuggler https://github.com/defparam/smuggler
# ✨ Context-aware XSS engine
require_sync XSStrike https://github.com/s0md3v/XSStrike
require_sync_optional sqlmap https://github.com/sqlmapproject/sqlmap
require_sync_optional wafw00f https://github.com/EnableSecurity/wafw00f

echo ""
echo "🔍 INTEGRITY:"
for d in SecLists nuclei ffuf smuggler XSStrike; do
  [ -d "$d" ] && echo "  ✅ $d" || { echo "  ❌ $d"; ARSENAL_SYNC_FAIL=1; }
done

echo "---"
if [ "$ARSENAL_SYNC_FAIL" -eq 0 ]; then
  echo "🚀 Web OK · WOW tip: python3 smuggler/smuggler.py -u https://target"
  echo "           python3 XSStrike/xsstrike.py -u 'https://target/?q=test'"
else
  echo "❌ Web modul má chyby."
fi
exit "$ARSENAL_SYNC_FAIL"
