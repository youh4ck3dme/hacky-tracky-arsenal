#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
elif [[ -f .env.example ]]; then
  cp .env.example .env
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
  echo "Created .env from .env.example"
fi

if ! command -v pnpm >/dev/null; then
  echo "pnpm is required. Install: npm i -g pnpm"
  exit 1
fi

# Install deps; continue if node_modules already exist (esbuild approve edge case)
if ! pnpm install; then
  if [[ -x backend/node_modules/.bin/tsx && -x frontend/node_modules/.bin/vite ]]; then
    echo "Warning: pnpm install had issues, but dependencies look present — continuing."
  else
    echo "pnpm install failed. Try: cd $(pwd) && pnpm approve-builds (select esbuild)"
    exit 1
  fi
fi

# If backend already running, only start frontend
BASE="http://127.0.0.1:${PORT:-3847}"
if curl -sf "$BASE/api/health" >/dev/null 2>&1; then
  echo "Backend already running at $BASE — starting frontend only."
  pnpm --filter arsenal-frontend dev
else
  pnpm run dev
fi
