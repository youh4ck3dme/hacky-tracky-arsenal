# Schrödinger API — short draft (not OpenAPI v2)

Auth: `Authorization: Bearer <token|panel-password>` on all routes except `/api/health`.

| Method | Path | Body / notes |
|--------|------|----------------|
| `POST` | `/api/schrodinger/scans` | `{ "target": "example.com" }` → `201` (`status: running`) · `429` if concurrency full |
| `GET` | `/api/schrodinger/scans` | List recent scans (limit ~50) |
| `GET` | `/api/schrodinger/scans/:id` | Full scan: vantages, matrix, timeline, `risk_score`, `notices`, `mode` |
| `DELETE` | `/api/schrodinger/scans/:id` | Cancel running/queued → `status: cancelled` |
| `GET` | `/api/schrodinger/scans/:id/stream` | SSE: `progress`, `vantage`, `timeline`, `finding`, `done` (+ event `id` / `Last-Event-ID`) |
| `GET` | `/api/schrodinger/scans/:id/audit` | Audit events for one scan |
| `GET` | `/api/schrodinger/audit` | Full audit ring (`?limit=100`) |
| `GET` | `/api/schrodinger/flags` | Resolved `FEATURE_*` map |

### Scan statuses

`queued` · `running` · `completed` · `failed` · `cancelled`

### Scan object (P1 fields)

```json
{
  "id": "uuid",
  "target": "example.com",
  "status": "completed",
  "risk_score": 42,
  "notices": ["DNS beží v mock režime …"],
  "mode": {
    "scanMode": "mock",
    "dnsMode": "mock",
    "dnsProvider": "mock",
    "dohEnabled": false,
    "portProfile": "quick",
    "enabledVantages": ["dns", "ua", "netweb", "time"]
  },
  "vantages": [],
  "matrix": [],
  "timeline": [],
  "error": null
}
```

### Errors

| Code | When |
|------|------|
| 400 | Invalid domain / IP literal / allowlist deny / dig missing (`SCHRODINGER_DNS_MODE=dig`) |
| 404 | Unknown scan id |
| 429 | Max concurrent scans (`SCHRODINGER_MAX_CONCURRENT`) |

### Flags (env)

See [LAB-WORKFLOW.md § Schrödinger flags](LAB-WORKFLOW.md#schrödinger-p1) and `.env.example`.

Canonical allowlist: **`SCHRODINGER_ALLOWLIST`** (alias `SCHRODINGER_TARGET_ALLOWLIST`).

### Out of scope for this draft

Watch scheduler, multi-region workers, Vertex AI, full OpenAPI v2.
