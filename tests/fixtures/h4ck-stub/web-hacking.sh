#!/usr/bin/env bash
set -euo pipefail
echo "Spúšťam modul: web-hacking.sh"
for t in SecLists Wordpress-Exploit-Framework wpscan; do
  echo "repo_dir=\"$t\""
  echo "git pull $t (stub OK)"
  sleep 0.1
done
echo "Modul web-hacking.sh hotový (stub)."
exit 0
