#!/bin/bash
set -uo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$H4CK_ROOT"
# shellcheck source=_arsenal-sync.sh
source "$H4CK_ROOT/_arsenal-sync.sh"

require_sync resolvers https://github.com/trickest/resolvers
require_sync pyWhat https://github.com/bee-san/pyWhat
require_sync AI-Hacking-Tools https://github.com/ottosulin/awesome-ai-security

exit "$ARSENAL_SYNC_FAIL"
