#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "Spúšťam modul: full-install.sh"
for s in exploit-tools.sh web-hacking.sh network-tools.sh malware-tools.sh ai-tools.sh; do
  echo "=== $s ==="
  bash "$ROOT/$s"
done
echo "Full install stub hotový."
exit 0
