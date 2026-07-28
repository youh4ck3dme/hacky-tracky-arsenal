#!/usr/bin/env bash
# Zapne celý lab naraz: Big Brother + Arsenal backend + PWA frontend.
set -euo pipefail
H4CK_ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$H4CK_ROOT/arsenal-pwa/scripts/dev-all.sh"
