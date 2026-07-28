variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "Primary GCP region"
  default     = "europe-west1"
}

variable "name_prefix" {
  type        = string
  description = "Resource name prefix (lowercase, hyphens)"
  default     = "schrodinger"
}

variable "subnet_cidr" {
  type        = string
  default     = "10.10.0.0/24"
  description = "VPC subnet CIDR"
}

variable "vpc_connector_cidr" {
  type        = string
  default     = "10.8.0.0/28"
  description = "Serverless VPC Access connector CIDR (/28)"
}

variable "cloud_sql_tier" {
  type        = string
  description = "Cloud SQL machine tier"
  default     = "db-f1-micro"
}

variable "db_name" {
  type    = string
  default = "schrodinger"
}

variable "db_user" {
  type    = string
  default = "schrodinger"
}

variable "redis_tier" {
  type        = string
  description = "Memorystore tier: BASIC or STANDARD_HA"
  default     = "BASIC"
}

variable "redis_memory_gb" {
  type    = number
  default = 1
}

variable "container_image" {
  type        = string
  description = "Full image URI. Empty = Artifact Registry :latest placeholder."
  default     = ""
}

variable "cloud_run_cpu" {
  type    = string
  default = "1"
}

variable "cloud_run_memory" {
  type    = string
  default = "512Mi"
}

variable "cloud_run_min_instances" {
  type    = number
  default = 0
}

variable "cloud_run_max_instances" {
  type    = number
  default = 5
}

variable "allow_unauthenticated" {
  type        = bool
  description = "If true, Cloud Run allows allUsers invoker (lab only)."
  default     = false
}

variable "enable_watch" {
  type        = bool
  description = "Enable Cloud Scheduler watch tick + FEATURE_schrodinger_watch"
  default     = true
}

variable "watch_schedule" {
  type        = string
  description = "Cron for watch tick (UTC unless timezone set)"
  default     = "*/15 * * * *"
}

variable "watch_timezone" {
  type    = string
  default = "Europe/Bratislava"
}

variable "allowlist" {
  type        = string
  description = "SCHRODINGER_ALLOWLIST value for Cloud Run"
  default     = "*"
}

variable "api_token" {
  type        = string
  description = "Optional fixed ARSENAL_API_TOKEN; empty generates random"
  default     = ""
  sensitive   = true
}

variable "vapid_public_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "vapid_private_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "deletion_protection" {
  type        = bool
  description = "Cloud SQL deletion protection"
  default     = true
}
