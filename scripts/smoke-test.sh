#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/.env"
  set +a
fi

TOKEN="${ARSENAL_API_TOKEN:-dev-token-change-me}"
PORT="${PORT:-3847}"
BASE="http://127.0.0.1:${PORT}"
AUTH="Authorization: Bearer $TOKEN"

STARTED_BACKEND=false
BPID=""

health_ok() {
  curl -sf "$BASE/api/health" >/dev/null 2>&1
}

port_in_use() {
  lsof -ti ":$PORT" >/dev/null 2>&1
}

ensure_backend() {
  if health_ok; then
    echo "Note: Backend already running at $BASE — reusing existing instance."
    return
  fi

  if port_in_use; then
    echo "Note: Port $PORT in use — waiting for backend health..."
    for _ in $(seq 1 5); do
      sleep 1
      if health_ok; then
        echo "Note: Backend healthy at $BASE — reusing existing instance."
        return
      fi
    done
    echo "FAIL: Port $PORT in use but health check failed at $BASE" >&2
    exit 1
  fi

  ./node_modules/.bin/tsx src/index.ts 2>/dev/null &
  BPID=$!
  STARTED_BACKEND=true
  for _ in $(seq 1 10); do
    sleep 1
    if health_ok; then
      return
    fi
  done
  echo "FAIL: Backend failed to start within 10s" >&2
  exit 1
}

ensure_backend

cleanup() {
  if [[ "$STARTED_BACKEND" == "true" && -n "$BPID" ]]; then
    kill "$BPID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

curl -sf "$BASE/api/health" | grep -q h4ckRoot && pass "1. Health endpoint" || fail "1. Health endpoint"

curl -sf -H "$AUTH" "$BASE/api/jobs" | grep -q moduleId && pass "2. Job history API" || fail "2. Job history API"

JOB_JSON=$(curl -sf -X POST -H "$AUTH" -H "Content-Type: application/json" -d '{"moduleId":"ai"}' "$BASE/api/jobs")
JOBID=$(echo "$JOB_JSON" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).id)")
[[ -n "$JOBID" ]] && pass "3. Create AI job ($JOBID)" || fail "3. Create AI job"

SSE_COUNT=$(timeout 6 curl -s -N -H "$AUTH" "$BASE/api/jobs/$JOBID/stream" | grep -c "^event:" || true)
[[ "$SSE_COUNT" -gt 0 ]] && pass "4. SSE log stream ($SSE_COUNT events)" || fail "4. SSE log stream"

for _ in $(seq 1 25); do
  JOB_JSON=$(curl -sf -H "$AUTH" "$BASE/api/jobs/$JOBID")
  STATUS=$(echo "$JOB_JSON" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).status)")
  [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]] && break
  sleep 2
done

EXIT=$(echo "$JOB_JSON" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(j.status+' exit='+j.exitCode+' logs='+j.logs.length)")
[[ "$STATUS" == "completed" ]] && pass "5. AI job completed ($EXIT)" || fail "5. AI job completed ($EXIT)"

curl -sf -H "$AUTH" "$BASE/api/arsenal/status" | grep -q scannedAt && pass "6. Arsenal status refresh" || fail "6. Arsenal status"

SCAN_JSON=$(curl -sf -X POST -H "$AUTH" -H "Content-Type: application/json" -d '{"target":"example.com"}' "$BASE/api/schrodinger/scans")
SCANID=$(echo "$SCAN_JSON" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).id)")
[[ -n "$SCANID" ]] && pass "7. Schrödinger scan created ($SCANID)" || fail "7. Schrödinger create"

for _ in $(seq 1 60); do
  SCAN_JSON=$(curl -sf -H "$AUTH" "$BASE/api/schrodinger/scans/$SCANID")
  SSTATUS=$(echo "$SCAN_JSON" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).status)")
  [[ "$SSTATUS" == "completed" || "$SSTATUS" == "failed" ]] && break
  sleep 2
done

SINFO=$(echo "$SCAN_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(s.status+' vantages='+s.vantages.length+' matrix='+s.matrix.length)")
VC=$(echo "$SCAN_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).vantages.length))")
[[ "$SSTATUS" == "completed" && "$VC" == "3" ]] && pass "8. Schrödinger completed ($SINFO)" || fail "8. Schrödinger ($SINFO)"

echo ""
echo "=== ALL SMOKE TESTS PASSED ==="
