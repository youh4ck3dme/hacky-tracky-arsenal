#!/bin/bash
set -uo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"
# shellcheck source=_arsenal-sync.sh
source "$H4CK_ROOT/_arsenal-sync.sh"

require_sync masscan https://github.com/robertdavidgraham/masscan
require_sync zmap https://github.com/zmap/zmap
require_sync bettercap https://github.com/evilsocket/bettercap

exit "$ARSENAL_SYNC_FAIL"
