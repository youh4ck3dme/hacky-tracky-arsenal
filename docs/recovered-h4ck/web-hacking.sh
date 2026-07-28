#!/bin/bash
set -uo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"
# shellcheck source=_arsenal-sync.sh
source "$H4CK_ROOT/_arsenal-sync.sh"

echo "🌐 Spúšťam modul: Web Warfare..."

require_sync SecLists https://github.com/danielmiessler/SecLists
require_sync_optional Wordpress-Exploit-Framework https://github.com/rastating/wordpress-exploit-framework
require_sync wpscan https://github.com/wpscanteam/wpscan

echo ""
echo "🔍 INTEGRITY CHECK:"
if [ -f "wpscan/lib/wpscan.rb" ] || [ -f "wpscan/bin/wpscan" ]; then
  echo "✅ WPScan je pripravený."
  ruby wpscan/lib/wpscan.rb --version 2>/dev/null || echo "   ℹ Tip: Spusti 'bundle install' v priečinku wpscan."
else
  echo "❌ WPScan nebol nájdený."
  ARSENAL_SYNC_FAIL=1
fi

if [ -d "SecLists" ]; then
  echo "✅ SecLists (Payloady) sú pripravené."
else
  ARSENAL_SYNC_FAIL=1
fi

if [ -d "Wordpress-Exploit-Framework" ]; then
  echo "✅ Wordpress Exploit Framework je pripravený."
else
  echo "⚠ Wordpress Exploit Framework chýba (voliteľný)."
fi

echo "---"
if [ "$ARSENAL_SYNC_FAIL" -eq 0 ]; then
  echo "🚀 Web modul je pripravený."
else
  echo "❌ Web modul má chyby — pozri log vyššie."
fi

exit "$ARSENAL_SYNC_FAIL"
