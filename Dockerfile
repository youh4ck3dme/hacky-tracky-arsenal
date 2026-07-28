# syntax=docker/dockerfile:1.7
# Multi-stage production image for Cloud Run (API + static PWA + optional dig).
# pnpm monorepo: arsenal-backend + arsenal-frontend

ARG NODE_VERSION=20
ARG PNPM_VERSION=11.5.2

# ── Base ─────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# ── Install all workspace deps (build) ───────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

# ── Build backend + frontend ─────────────────────────────────────────────────
FROM deps AS build
COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared
COPY tsconfig*.json ./
# Root may not have tsconfig — ignore if missing
RUN pnpm --filter arsenal-backend build \
 && pnpm --filter arsenal-frontend build

# Portable production package for backend only (node_modules pruned).
# dist/ is gitignored so copy it explicitly after deploy.
RUN pnpm --filter arsenal-backend deploy --prod /out/backend \
 && rm -rf /out/backend/dist \
 && cp -R /app/backend/dist /out/backend/dist

# ── Runtime (Cloud Run) ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

# dig for DigDnsProvider; ca-certificates for HTTPS egress
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates dnsutils \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 arsenal \
 && useradd --system --uid 1001 --gid arsenal --home /app --shell /usr/sbin/nologin arsenal

WORKDIR /app

# Layout keeps config arsenalRoot = path.resolve(backend/dist, '../..') → /app
COPY --from=build --chown=arsenal:arsenal /out/backend/package.json ./backend/package.json
COPY --from=build --chown=arsenal:arsenal /out/backend/node_modules ./backend/node_modules
COPY --from=build --chown=arsenal:arsenal /out/backend/dist ./backend/dist
COPY --from=build --chown=arsenal:arsenal /app/frontend/dist ./frontend/dist
COPY --from=build --chown=arsenal:arsenal /app/shared ./shared
# Minimal H4CK stub so validateH4ckRoot() succeeds in containers
COPY --chown=arsenal:arsenal tests/fixtures/h4ck-stub ./h4ck-stub

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    H4CK_ROOT=/app/h4ck-stub \
    SCHRODINGER_SCAN_MODE=live \
    SCHRODINGER_DNS_MODE=auto

# Cloud Run expects process to listen on $PORT
EXPOSE 8080

USER arsenal
WORKDIR /app/backend

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
