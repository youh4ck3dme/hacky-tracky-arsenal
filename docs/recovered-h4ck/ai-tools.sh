#!/usr/bin/env bash
set -uo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"
# shellcheck source=_arsenal-sync.sh
source "$H4CK_ROOT/_arsenal-sync.sh"

echo "🧠 Spúšťam modul: AI / OSINT"
echo "   Top public: sherlock · theHarvester · amass · resolvers · pyWhat (opt)"

require_sync sherlock https://github.com/sherlock-project/sherlock
require_sync theHarvester https://github.com/laramies/theHarvester
require_sync amass https://github.com/owasp-amass/amass
require_sync resolvers https://github.com/trickest/resolvers
require_sync_optional pyWhat https://github.com/bee-san/pyWhat

# Ensure resolvers.txt path for Schrödinger / preflight
if [ -f "resolvers/resolvers.txt" ]; then
  echo "✅ resolvers/resolvers.txt"
elif [ -f "resolvers/resolvers-top10000.txt" ]; then
  ln -sfn resolvers-top10000.txt resolvers/resolvers.txt 2>/dev/null || \
    cp resolvers/resolvers-top10000.txt resolvers/resolvers.txt 2>/dev/null || true
  echo "✅ resolvers list linked"
else
  ls resolvers 2>/dev/null | head -5 || true
fi

echo "---"
if [ "$ARSENAL_SYNC_FAIL" -eq 0 ]; then
  echo "🚀 OSINT modul pripravený (sherlock, theHarvester, amass, resolvers)."
else
  echo "❌ OSINT modul má chyby."
fi
exit "$ARSENAL_SYNC_FAIL"
