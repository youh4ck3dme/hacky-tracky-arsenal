#!/usr/bin/env bash
set -euo pipefail
echo "Spúšťam modul: network-tools.sh"
for t in masscan zmap bettercap; do
  echo "repo_dir=\"$t\""
  echo "git pull $t (stub OK)"
  sleep 0.1
done
echo "Modul network-tools.sh hotový (stub)."
exit 0
