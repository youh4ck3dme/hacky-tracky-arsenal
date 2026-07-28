#!/usr/bin/env bash
set -uo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"

echo "🛠️ Spúšťam kompletnú inštaláciu Arzenálu (best public stack)..."
echo "------------------------------------------"
FAIL=0

run_subscript() {
  local script_name=$1
  echo "➡ Spúšťam modul: $script_name"
  if [ -f "$script_name" ]; then
    if bash "$script_name"; then
      echo "   ✓ $script_name OK"
    else
      echo "   ✗ $script_name FAILED (exit $?)"
      FAIL=1
    fi
  else
    echo "   ❌ Modul $script_name nebol nájdený!"
    FAIL=1
  fi
  echo ""
}

run_subscript "exploit-tools.sh"
run_subscript "web-hacking.sh"
run_subscript "network-tools.sh"
run_subscript "malware-tools.sh"
run_subscript "ai-tools.sh"

echo "------------------------------------------"
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Inštalácia Arzenálu úspešná."
else
  echo "❌ Inštalácia s chybami — pozri logy."
fi
exit "$FAIL"
