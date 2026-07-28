#!/usr/bin/env bash
set -uo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"
# shellcheck source=_arsenal-sync.sh
source "$H4CK_ROOT/_arsenal-sync.sh"

echo "🧠 Spúšťam modul: AI / OSINT / LLM red-team"
echo "   Core: sherlock · theHarvester · amass · resolvers"
echo "   ✨ WOW: garak (NVIDIA — LLM vulnerability scanner) · SpiderFoot (full OSINT automation)"

require_sync sherlock https://github.com/sherlock-project/sherlock
require_sync theHarvester https://github.com/laramies/theHarvester
require_sync amass https://github.com/owasp-amass/amass
require_sync resolvers https://github.com/trickest/resolvers
# ✨ LLM red team — prompt injection, jailbreak, data leak probes
require_sync garak https://github.com/NVIDIA/garak
# ✨ 200+ OSINT modules, UI + CLI
require_sync spiderfoot https://github.com/smicallef/spiderfoot
require_sync_optional pyWhat https://github.com/bee-san/pyWhat
require_sync_optional GHunt https://github.com/mxrch/GHunt

if [ -f "resolvers/resolvers.txt" ]; then
  echo "✅ resolvers/resolvers.txt"
elif [ -f "resolvers/resolvers-top10000.txt" ]; then
  ln -sfn resolvers-top10000.txt resolvers/resolvers.txt 2>/dev/null || \
    cp resolvers/resolvers-top10000.txt resolvers/resolvers.txt 2>/dev/null || true
fi

echo "---"
if [ "$ARSENAL_SYNC_FAIL" -eq 0 ]; then
  echo "🚀 OSINT/AI OK · WOW tip: python3 -m garak --model_type rest -t dan"
  echo "                 python3 spiderfoot/sf.py -l 127.0.0.1:5001"
else
  echo "❌ OSINT/AI modul má chyby."
fi
exit "$ARSENAL_SYNC_FAIL"
