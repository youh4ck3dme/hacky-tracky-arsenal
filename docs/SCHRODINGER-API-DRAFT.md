# Schrödinger API — short draft (not OpenAPI v2)

Auth: `Authorization: Bearer <token|panel-password>` on all routes except `/api/health`.

| Method | Path | Body / notes |
|--------|------|----------------|
| `POST` | `/api/schrodinger/scans` | `{ "target": "example.com" }` → `201` scan object (`status: running`) |
| `GET` | `/api/schrodinger/scans/:id` | Full scan: vantages, matrix, timeline, `risk_score`, `notices`, `mode` |
| `GET` | `/api/schrodinger/scans/:id/stream` | SSE: `progress`, `vantage`, `timeline`, `finding`, `done` |

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

### Errors (400)

- Invalid domain / IP literal
- Allowlist deny (`SCHRODINGER_ALLOWLIST`)
- dig missing when `SCHRODINGER_DNS_MODE=dig`

### Out of scope for this draft

Watch scheduler, multi-region workers, Vertex AI, full OpenAPI v2.
