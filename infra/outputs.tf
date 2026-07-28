output "cloud_run_uri" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.api.uri
}

output "cloud_run_name" {
  value = google_cloud_run_v2_service.api.name
}

output "artifact_registry_repo" {
  value = google_artifact_registry_repository.app.name
}

output "container_image_hint" {
  description = "Build & push target for the multi-stage Dockerfile"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}/arsenal:latest"
}

output "cloud_sql_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "cloud_sql_instance" {
  value = google_sql_database_instance.postgres.name
}

output "redis_host" {
  value     = google_redis_instance.sse.host
  sensitive = true
}

output "redis_port" {
  value = google_redis_instance.sse.port
}

output "secret_ids" {
  description = "Secret Manager secret ids (not values)"
  value = {
    postgres_url  = google_secret_manager_secret.postgres_url.secret_id
    api_token     = google_secret_manager_secret.api_token.secret_id
    vapid_public  = google_secret_manager_secret.vapid_public.secret_id
    vapid_private = google_secret_manager_secret.vapid_private.secret_id
    redis_host    = google_secret_manager_secret.redis_host.secret_id
  }
}

output "scheduler_job" {
  value = var.enable_watch ? google_cloud_scheduler_job.watch_tick[0].name : null
}

output "runtime_service_account" {
  value = google_service_account.runtime.email
}

output "deploy_commands" {
  description = "Copy-paste deploy flow after terraform apply"
  value       = <<-EOT
    # 1) Build multi-stage image
    gcloud builds submit --tag ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}/arsenal:latest .

    # 2) Point Cloud Run at the new image (if not using continuous deploy)
    gcloud run services update ${google_cloud_run_v2_service.api.name} \
      --region ${var.region} \
      --image ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}/arsenal:latest

    # 3) Apply SQL migrations (one-shot)
    # psql "$SCHRODINGER_POSTGRES_URL" -f backend/src/db/migrations/001_schrodinger_p2.sql
  EOT
}
