# Schrödinger Observation Platform — P2 + P3 Architecture & Platform Guide

> Version: 2.2 · Date: 2026-07-29 · Status: Lab-Grade 22/10

---

## 1. Local vs. Google Cloud Platform (GCP) Execution

The Schrödinger Observation Platform is built with a **hybrid local/cloud paradigm**:

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Local Development                        │
│  - Storage: In-Memory / File JSON / Docker Compose Postgres     │
│  - Queue/PubSub: Local interval timer                           │
│  - DNS: System `dig` CLI or MockDnsProvider                     │
│  - AI Triage: Heuristic fallback engine                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼ (Feature Flags / Config)
┌─────────────────────────────────────────────────────────────────┐
│                       Google Cloud Platform                     │
│  - Storage: Cloud SQL PostgreSQL (SSL enabled)                  │
│  - Queue/PubSub: Cloud Scheduler → Pub/Sub → Cloud Run Worker   │
│  - DNS: Multi-region egress probes (europe-west1 + us-central1) │
│  - AI Triage: Vertex AI Gemini 1.5 Pro API                      │
│  - Telemetry: BigQuery Audit Sink (`schrodinger_telemetry`)     │
│  - Secrets: Secret Manager (`schrodinger-postgres-connection`)  │
└─────────────────────────────────────────────────────────────────┘
```

### Local Dev Setup
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### GCP Production Setup
- Environment variables configured via Secret Manager / Cloud Run revision:
  - `SCHRODINGER_POSTGRES_URL=postgresql://user:pass@/schrodinger?host=/cloudsql/project:region:instance`
  - `FEATURE_schrodinger_watch=true`
  - `FEATURE_schrodinger_vertex_triage=true`
  - `FEATURE_schrodinger_multi_region=true`

---

## 2. Rough Cost Estimate (USD per 1,000 Scans)

| Resource | Usage / 1k Scans | Est. Cost (USD) |
|---|---|---|
| Cloud Run (API + Worker) | 1,000 requests @ 2.5s avg | $0.08 |
| Cloud SQL Postgres (db-f1-micro) | Shared instance per month | $9.00 / mo |
| Vertex AI Gemini 1.5 Pro Triage | ~500 prompt tokens / call | $0.25 |
| BigQuery Telemetry Sink | ~1MB JSON streaming insert | $0.01 |
| **Total per 1,000 Scans** | | **~$0.34** (+ base SQL) |

---

## 3. Security Review Checklist

- [x] **SSRF Prevention**: Post-DNS IP validation blocks RFC1918, link-local, loopback, IPv6 ULA/link-local, and cloud metadata (`169.254.169.254`).
- [x] **Target Allowlist**: Mandatory allowlist check (`SCHRODINGER_ALLOWLIST`). Default `*` for lab environment.
- [x] **No Secrets in Code**: All API keys (VAPID, Vertex AI, Postgres connection) read exclusively from environment variables / Secret Manager.
- [x] **Safe Tool Suggestions**: Arsenal Tool Bridge strictly presents draft job parameters to the operator and **NEVER auto-executes** vulnerability tools or malware payloads.
- [x] **Concurrency & DoS Guard**: ConcurrencyLimiter caps parallel scans per instance to prevent resource exhaustion (HTTP 429).

---

## 4. Residual Risk Log (What is NOT yet 22/10)

1. **DoH Provider Rate Limits**: If DoH query volume exceeds Cloudflare/Google public resolver free tiers under extreme burst scanning, fallback relies solely on system `dig`.
2. **Postgres Automatic Schema Migrations**: In production, DDL migrations in `backend/src/db/migrations` must be executed prior to deployment via CI/CD pipeline or migration tool (e.g. `golang-migrate` / `dbmate`).
3. **Single-Region Redis Failover**: Local Redis pub-sub SSE fan-out uses single instance fallback when Memorystore HA is disabled in dev mode.
