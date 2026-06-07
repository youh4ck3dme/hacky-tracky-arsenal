#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/.env"
  set +a
fi

H4CK_ROOT="${H4CK_ROOT:-$(cd "$ROOT/.." && pwd)}"
FAILURES=0

check() {
  local label="$1"
  shift
  if "$@"; then
    echo "OK:   $label"
  else
    echo "FAIL: $label"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "=== Arsenal PWA Preflight ==="
echo "H4CK_ROOT: $H4CK_ROOT"
echo ""

check "pnpm installed" command -v pnpm
check "curl installed" command -v curl
check "dig installed" command -v dig
check "git installed" command -v git
check "resolvers.txt exists" test -f "$H4CK_ROOT/resolvers/resolvers.txt"
check "hacky-admin-menu.sh exists" test -f "$H4CK_ROOT/hacky-admin-menu.sh"
check "backend tsx binary" test -x "$ROOT/backend/node_modules/.bin/tsx"
check "frontend vite binary" test -x "$ROOT/frontend/node_modules/.bin/vite"
check ".env present" test -f "$ROOT/.env"

echo ""
if [[ "$FAILURES" -gt 0 ]]; then
  echo "Preflight checks failed ($FAILURES). Fix the items above before starting."
  exit 1
fi

echo "Running smoke tests..."
echo ""
"$ROOT/scripts/smoke-test.sh"

echo ""
echo "=== Demo checklist (docs/DEMO-SCRIPT.md) ==="
check "./start.sh ready (deps OK)" test -x "$ROOT/start.sh"
check "API token configured" grep -q '^ARSENAL_API_TOKEN=' "$ROOT/.env"
if curl -sf "http://127.0.0.1:${PORT:-3847}/api/health" >/dev/null 2>&1; then
  echo "OK:   Backend health endpoint"
else
  echo "FAIL: Backend health endpoint"
  FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ "$FAILURES" -gt 0 ]]; then
  echo "Demo checklist has failures — review before presenting."
  exit 1
fi

echo "=== PREFLIGHT PASSED — run ./start.sh and open http://127.0.0.1:5173 ==="
