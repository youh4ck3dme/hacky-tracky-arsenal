/**
 * Schrödinger Observation Platform — GCP baseline (Terraform)
 *
 * Resources:
 *   - Artifact Registry + Cloud Run (API/worker)
 *   - Cloud SQL Postgres (db-f1-micro)
 *   - Memorystore Redis (SSE fan-out)
 *   - Secret Manager (Postgres URL, VAPID keys, API token)
 *   - Cloud Scheduler → POST /api/schrodinger/watch/tick
 *
 * Usage:
 *   cd infra
 *   terraform init
 *   terraform plan  -var="project_id=YOUR_PROJECT"
 *   terraform apply -var="project_id=YOUR_PROJECT"
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.30.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {
  project_id = var.project_id
}

# ── APIs ─────────────────────────────────────────────────────────────────────

resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com",
    "artifactregistry.googleapis.com",
    "vpcaccess.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "servicenetworking.googleapis.com",
  ])
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# ── Networking (Serverless VPC for Cloud SQL / Memorystore) ──────────────────

resource "google_compute_network" "vpc" {
  name                    = "${var.name_prefix}-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.services]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.name_prefix}-subnet"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id
}

resource "google_compute_global_address" "private_services" {
  name          = "${var.name_prefix}-psa"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_services.name]
  depends_on              = [google_project_service.services]
}

resource "google_vpc_access_connector" "connector" {
  name          = "${var.name_prefix}-vpcconn"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = var.vpc_connector_cidr
  min_instances = 2
  max_instances = 3
  depends_on    = [google_project_service.services]
}

# ── Artifact Registry ────────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = "${var.name_prefix}-images"
  description   = "Schrödinger / Arsenal container images"
  format        = "DOCKER"
  depends_on    = [google_project_service.services]
}

# ── Cloud SQL Postgres (db-f1-micro) ─────────────────────────────────────────

resource "random_password" "db" {
  length  = 24
  special = false
}

resource "google_sql_database_instance" "postgres" {
  name             = "${var.name_prefix}-pg"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = var.cloud_sql_tier
    availability_type = "ZONAL"
    disk_size         = 10
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = var.deletion_protection
  depends_on = [
    google_project_service.services,
    google_service_networking_connection.private_vpc,
  ]
}

resource "google_sql_database" "schrodinger" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "schrodinger" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = random_password.db.result
}

# ── Memorystore Redis ────────────────────────────────────────────────────────

resource "google_redis_instance" "sse" {
  name               = "${var.name_prefix}-redis"
  tier               = var.redis_tier
  memory_size_gb     = var.redis_memory_gb
  region             = var.region
  redis_version      = "REDIS_7_0"
  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  display_name       = "Schrödinger SSE fan-out"
  depends_on = [
    google_project_service.services,
    google_service_networking_connection.private_vpc,
  ]
}

# ── Secrets ──────────────────────────────────────────────────────────────────

resource "random_password" "api_token" {
  length  = 32
  special = false
}

resource "random_id" "vapid_placeholder" {
  byte_length = 16
}

locals {
  api_token_value = var.api_token != "" ? var.api_token : random_password.api_token.result
  # Cloud SQL Unix socket style URL for Cloud Run + cloudsql volumes
  postgres_url = format(
    "postgresql://%s:%s@/%s?host=/cloudsql/%s",
    var.db_user,
    random_password.db.result,
    var.db_name,
    google_sql_database_instance.postgres.connection_name,
  )
  redis_url = format("redis://%s:%s", google_redis_instance.sse.host, google_redis_instance.sse.port)
  image     = var.container_image != "" ? var.container_image : "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}/arsenal:latest"
}

resource "google_secret_manager_secret" "postgres_url" {
  secret_id = "${var.name_prefix}-postgres-connection"
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "postgres_url" {
  secret      = google_secret_manager_secret.postgres_url.id
  secret_data = local.postgres_url
}

resource "google_secret_manager_secret" "api_token" {
  secret_id = "${var.name_prefix}-api-token"
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "api_token" {
  secret      = google_secret_manager_secret.api_token.id
  secret_data = local.api_token_value
}

resource "google_secret_manager_secret" "vapid_public" {
  secret_id = "${var.name_prefix}-vapid-public"
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "vapid_public" {
  secret      = google_secret_manager_secret.vapid_public.id
  secret_data = var.vapid_public_key != "" ? var.vapid_public_key : "REPLACE_ME_VAPID_PUBLIC_${random_id.vapid_placeholder.hex}"
}

resource "google_secret_manager_secret" "vapid_private" {
  secret_id = "${var.name_prefix}-vapid-private"
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "vapid_private" {
  secret      = google_secret_manager_secret.vapid_private.id
  secret_data = var.vapid_private_key != "" ? var.vapid_private_key : "REPLACE_ME_VAPID_PRIVATE_${random_id.vapid_placeholder.hex}"
}

resource "google_secret_manager_secret" "redis_host" {
  secret_id = "${var.name_prefix}-redis-host"
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "redis_host" {
  secret      = google_secret_manager_secret.redis_host.id
  secret_data = local.redis_url
}

# ── Service account ──────────────────────────────────────────────────────────

resource "google_service_account" "runtime" {
  account_id   = "${var.name_prefix}-run"
  display_name = "Schrödinger Cloud Run runtime"
}

resource "google_project_iam_member" "runtime_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_secrets" {
  for_each = {
    pg     = google_secret_manager_secret.postgres_url.id
    token  = google_secret_manager_secret.api_token.id
    vapidP = google_secret_manager_secret.vapid_public.id
    vapidS = google_secret_manager_secret.vapid_private.id
    redis  = google_secret_manager_secret.redis_host.id
  }
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

# ── Cloud Run (API + static UI + watch worker entry) ─────────────────────────

resource "google_cloud_run_v2_service" "api" {
  name     = "${var.name_prefix}-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }

    containers {
      image = local.image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
      }

      env {
        name  = "HOST"
        value = "0.0.0.0"
      }
      env {
        name  = "PORT"
        value = "8080"
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "H4CK_ROOT"
        value = "/app/h4ck-stub"
      }
      env {
        name  = "FEATURE_schrodinger_persist_postgres"
        value = "true"
      }
      env {
        name  = "FEATURE_schrodinger_watch"
        value = var.enable_watch ? "true" : "false"
      }
      env {
        name  = "FEATURE_schrodinger_v2_providers"
        value = "true"
      }
      env {
        name  = "SCHRODINGER_ALLOWLIST"
        value = var.allowlist
      }
      env {
        name  = "SCHRODINGER_DNS_MODE"
        value = "auto"
      }

      env {
        name = "SCHRODINGER_POSTGRES_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.postgres_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "ARSENAL_API_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_token.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "VAPID_PUBLIC_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.vapid_public.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "VAPID_PRIVATE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.vapid_private.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.redis_host.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      startup_probe {
        http_get {
          path = "/api/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 6
      }

      liveness_probe {
        http_get {
          path = "/api/health"
        }
        period_seconds = 30
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.services,
    google_secret_manager_secret_version.postgres_url,
    google_secret_manager_secret_version.api_token,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  project  = var.project_id
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ── Cloud Scheduler → watch tick ─────────────────────────────────────────────

resource "google_service_account" "scheduler" {
  account_id   = "${var.name_prefix}-sched"
  display_name = "Schrödinger Cloud Scheduler invoker"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

resource "google_cloud_scheduler_job" "watch_tick" {
  count       = var.enable_watch ? 1 : 0
  name        = "${var.name_prefix}-watch-tick"
  description = "Periodic Schrödinger watch engine tick"
  schedule    = var.watch_schedule
  time_zone   = var.watch_timezone
  region      = var.region

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.api.uri}/api/schrodinger/watch/tick"
    headers = {
      "Content-Type"  = "application/json"
      # Express authMiddleware expects API bearer (OIDC only unlocks Cloud Run IAM)
      "Authorization" = "Bearer ${local.api_token_value}"
    }
    body = base64encode("{}")

    oidc_token {
      service_account_email = google_service_account.scheduler.email
      audience              = google_cloud_run_v2_service.api.uri
    }
  }

  depends_on = [
    google_project_service.services,
    google_cloud_run_v2_service_iam_member.scheduler_invoker,
  ]
}
