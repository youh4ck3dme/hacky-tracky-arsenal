# Schrödinger Observation Platform — P0 Architecture

> Version: 2.0 P0 · Date: 2026-07-28 · Status: Production-ready lab foundation

## Overview

P0 transforms the Schrödinger MVP scanner into a production-grade **Observation Platform** using the **strangler pattern** — no breaking changes, additive layers that wrap the existing scan engine.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React PWA)                      │
│  SchrodingerScan.tsx → useSchrodingerScan hook → SSE (event IDs)│
│  Cancel button · Shadow Diff · Palimpsest Timeline               │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP + SSE
┌─────────────────────────┴───────────────────────────────────────┐
│                        API Routes                                │
│  POST /scans · GET /scans · GET /scans/:id · DELETE /scans/:id   │
│  GET /scans/:id/stream (SSE + Last-Event-ID)                     │
│  GET /scans/:id/audit · GET /audit · GET /flags                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                     Guardrails Layer                              │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐      │
│  │ Allowlist     │ │ SSRF Block   │ │ Concurrency Limiter │      │
│  │ (domain glob) │ │ (post-DNS)   │ │ (semaphore, max 3)  │      │
│  └──────────────┘ └──────────────┘ └─────────────────────┘      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                 SchrodingerScannerService                         │
│  createScan() → runScan(signal, release) → 4 vantage probes     │
│  cancelScan() → AbortController.abort() → status='cancelled'    │
│  subscribe() → SSE with event IDs                                │
│                                                                   │
│  DNS Vantage ──→ DnsProvider (dig/mock) ──→ SSRF check           │
│  UA Vantage ───→ fetchWithUa (3 agents)                          │
│  NetWeb ───────→ TCP probe + HTTP paths                          │
│  Time/Palimpsest → Wayback CDX → ghost detection                 │
│                                                                   │
│  Matrix Classification → Rule Engine → risk_score                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                     Persistence Layer                             │
│  ScanStore (file-backed JSON, P0)                                │
│  AuditLog (in-memory ring buffer, 1000 events)                   │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │MemoryStore   │  │ FileJsonStore│  │ PostgresStore│           │
│  │ (P0 module)  │  │ (P0 module)  │  │ (stub, P1)   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘

Feature Flags: schrodinger.guardrails (ON) · persist.postgres (OFF) · v2_providers (ON — Dig/Mock P1)
```

## ERD (Entity Relationship Diagram)

```
┌──────────────────┐       ┌──────────────────────────────────┐
│      Target      │       │         SchrodingerScan           │
├──────────────────┤       ├──────────────────────────────────┤
│ id        UUID   │  1:N  │ id            UUID (PK)          │
│ domain    TEXT   │──────→│ target        TEXT               │
│ addedBy   TEXT   │       │ status        ENUM (queued|      │
│ addedAt   TS     │       │               running|completed| │
│ notes     TEXT?  │       │               failed|cancelled)  │
└──────────────────┘       │ createdAt     TIMESTAMPTZ        │
                           │ finishedAt    TIMESTAMPTZ?       │
                           │ vantages      JSONB              │
                           │ matrix        JSONB              │
                           │ timeline      JSONB              │
                           │ error         TEXT?              │
                           │ risk_score    INT?               │
                           │ notices       TEXT[]             │
                           │ mode          JSONB              │
                           └────────┬─────────────────────────┘
                                    │ 1:N
                           ┌────────┴─────────────────────────┐
                           │         VantageRun                │
                           ├──────────────────────────────────┤
                           │ id          UUID (PK)            │
                           │ scanId      UUID (FK→Scan)       │
                           │ vantageId   ENUM (dns|ua|        │
                           │             netweb|time)         │
                           │ startedAt   TIMESTAMPTZ          │
                           │ finishedAt  TIMESTAMPTZ?         │
                           │ status      ENUM                 │
                           │ findingCount INT                 │
                           └──────────────────────────────────┘

┌──────────────────────────────────────────┐
│           AuditEvent                      │
├──────────────────────────────────────────┤
│ id        UUID (PK)                      │
│ action    ENUM (scan.created|completed|  │
│           failed|cancelled|              │
│           target.blocked|ssrf.blocked)   │
│ actor     TEXT                           │
│ target    TEXT?                          │
│ scanId    UUID? (FK→Scan)               │
│ ts        TIMESTAMPTZ                    │
│ detail    JSONB                          │
└──────────────────────────────────────────┘
```

## Threat Model (Short)

### SSRF (Server-Side Request Forgery)
- **Threat**: Attacker submits a target that DNS-resolves to internal infrastructure (10.x, 172.16.x, 192.168.x, 169.254.169.254 cloud metadata).
- **Mitigation**: Post-DNS-resolve IP validation against blocked CIDR ranges. Both IPv4 and IPv6. Checked AFTER dig returns but BEFORE any TCP connect or HTTP fetch.
- **Test**: Unit tests verify 169.254.169.254 is always blocked. Zero metadata IP in tests.

### Target Allowlist
- **Threat**: Unrestricted scanning of arbitrary domains could be abused.
- **Mitigation**: Configurable allowlist (`SCHRODINGER_ALLOWLIST`, alias `SCHRODINGER_TARGET_ALLOWLIST`). Default `*` for lab use. Glob support (`*.example.com`). Feature-flag gated (`FEATURE_schrodinger_guardrails`).

### Concurrency Exhaustion
- **Threat**: Many simultaneous scans could exhaust server resources.
- **Mitigation**: Semaphore-based concurrency limiter (default max 3). Returns HTTP 429 when exceeded.

### Audit Trail
- **Threat**: No visibility into who scanned what, when.
- **Mitigation**: In-memory ring buffer (1000 events) logging scan.created, scan.completed, scan.failed, scan.cancelled, target.blocked, ssrf.blocked events.

### Secrets
- **No secrets in git**. All credentials via env vars / Secret Manager.
- Secret Manager keys for production:
  - `schrodinger-postgres-connection-string`
  - `schrodinger-postgres-ca-cert`

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `schrodinger.guardrails` | `true` | SSRF validation, allowlist, concurrency limit |
| `schrodinger.persist.postgres` | `false` | Cloud SQL Postgres persistence (P1) |
| `schrodinger.v2_providers` | `false` | V2 DNS/probe provider system (P1) |

Override via env: `FEATURE_schrodinger_guardrails=false`

## SSE Protocol

```
GET /api/schrodinger/scans/:id/stream
Headers: Last-Event-ID: <n> (optional, for reconnect)

→ id: 1
→ event: vantage
→ data: {"id":"dns","name":"DNS Resolvers","findings":[...],"summary":"..."}

→ id: 2
→ event: progress
→ data: {"vantage":"ua","label":"Chrome","current":1,"total":3}

→ id: 3
→ event: vantage
→ data: {"id":"ua",...}

→ id: N
→ event: done
→ data: {"status":"completed","error":null,"risk_score":42,"notices":[]}
```

## Rollback Plan

P0 is additive — rollback to MVP behavior:

1. **Feature flags**: Set `FEATURE_schrodinger_guardrails=false` → disables all guardrails
2. **Git revert**: All P0 code is in:
   - `backend/src/schrodinger/` (new directory, safe to delete)
   - Modified files have additive changes only (new imports, new fields with defaults)
3. **Store**: ScanStore already existed, no schema migration needed
4. **Types**: `ScanStatus += 'cancelled'` is backward-compatible (old clients ignore unknown status)
5. **Frontend**: Cancel button hidden when not running (no UI breakage)

## Files Changed (P0)

### New Files
| Path | Purpose |
|------|---------|
| `backend/src/schrodinger/domain.ts` | Domain model types |
| `backend/src/schrodinger/featureFlags.ts` | Feature flag system |
| `backend/src/schrodinger/ssrf.ts` | SSRF IP validator |
| `backend/src/schrodinger/guardrails.ts` | Allowlist + concurrency |
| `backend/src/schrodinger/auditLog.ts` | Audit event ring buffer |
| `backend/src/schrodinger/store.ts` | ScanStore interface |
| `backend/src/schrodinger/memoryStore.ts` | In-memory store |
| `backend/src/schrodinger/fileStore.ts` | File JSON store |
| `backend/src/schrodinger/postgresStore.ts` | Postgres stub |
| `backend/src/schrodinger/dnsProvider.ts` | DNS provider interface |
| `backend/src/schrodinger/digDnsProvider.ts` | Dig DNS stub |
| `backend/src/schrodinger/mockDnsProvider.ts` | Mock DNS fixtures |
| `backend/src/schrodinger/index.ts` | Barrel export |

### Modified Files
| Path | Changes |
|------|---------|
| `backend/src/config.ts` | Added `schrodinger` config block |
| `backend/src/types/schrodinger.ts` | `ScanStatus += 'cancelled'` |
| `backend/src/services/schrodinger/scanner.ts` | Concurrency, abort, audit |
| `backend/src/routes/schrodinger.ts` | Cancel, list, audit, flags, SSE IDs |
| `frontend/src/types/schrodinger.ts` | `ScanStatus += 'cancelled'` |
| `frontend/src/lib/api.ts` | `cancelSchrodingerScan()` |
| `frontend/src/pages/SchrodingerScan.tsx` | Cancel button |
| `.env.example` | P0 env vars |

## DNS Provider Interface (P1 Prep)

```typescript
interface DnsProvider {
  resolve(domain: string, recordType: DnsRecordType, resolver: string): Promise<DnsResult>;
  readonly name: string;
}

type DnsRecordType = 'A' | 'AAAA' | 'MX' | 'TXT' | 'CNAME' | 'NS' | 'SOA';
```

Implementations:
- **DigDnsProvider**: Wraps `dig` CLI, P0 stub (A records only)
- **MockDnsProvider**: Deterministic fixtures for testing

Full multi-record DNS resolution is P1 scope.
