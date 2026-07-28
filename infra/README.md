# Schrödinger GCP infrastructure (Terraform)

Minimal production-oriented stack for the Arsenal + Schrödinger Observation Platform.

## Resources

| Resource | Purpose |
|----------|---------|
| **Cloud Run** | API + PWA static + watch worker entry (`PORT=8080`) |
| **Cloud SQL Postgres 16** | `db-f1-micro` persistence (`FEATURE_schrodinger_persist_postgres`) |
| **Memorystore Redis** | SSE cluster fan-out (`REDIS_URL`) |
| **Secret Manager** | Postgres URL, API token, VAPID public/private, Redis host |
| **Cloud Scheduler** | `POST /api/schrodinger/watch/tick` every 15m (optional) |
| **VPC + connector** | Private access to SQL + Redis |

## Prerequisites

- Terraform ≥ 1.5
- `gcloud` auth: `gcloud auth application-default login`
- Billing-enabled GCP project
- APIs are enabled by this module on first apply

## Quick start

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# edit project_id

terraform init
terraform plan  -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

### Build & push image (from monorepo root)

```bash
# after apply, outputs.container_image_hint shows the target
export REGION=europe-west1
export PROJECT=your-gcp-project-id
export REPO=schrodinger-images

gcloud builds submit --tag "${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/arsenal:latest" .
```

Or local Docker:

```bash
docker build -t arsenal:local .
docker run --rm -p 8080:8080 \
  -e ARSENAL_API_TOKEN=dev \
  -e ARSENAL_PANEL_PASSWORD=23513900 \
  arsenal:local
# health: curl -s localhost:8080/api/health
```

## Local dependencies (no GCP)

```bash
# monorepo root
docker compose -f docker-compose.dev.yml up -d
# Postgres :5432  Redis :6379
```

See root `.env.example` for `SCHRODINGER_POSTGRES_URL` / `REDIS_URL`.

## Watch tick contract

| Item | Value |
|------|--------|
| Method | `POST` |
| Path | `/api/schrodinger/watch/tick` |
| Auth | Cloud Scheduler OIDC → Cloud Run invoker SA |
| Flag | `FEATURE_schrodinger_watch=true` |

## Cost note (lab)

`db-f1-micro` + BASIC Redis + Cloud Run scale-to-zero is the cheap baseline. STANDARD_HA Redis and higher SQL tiers for production HA.
