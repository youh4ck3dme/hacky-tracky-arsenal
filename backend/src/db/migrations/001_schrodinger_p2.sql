-- Schrödinger Observation Platform P2 Database Schema

CREATE TABLE IF NOT EXISTS targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    added_by VARCHAR(255) NOT NULL DEFAULT 'system',
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY,
    target VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    vantages JSONB NOT NULL DEFAULT '[]'::jsonb,
    matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
    timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    error TEXT,
    risk_score INT,
    notices TEXT[] DEFAULT '{}',
    mode JSONB
);

CREATE INDEX IF NOT EXISTS idx_scans_target ON scans(target);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);

CREATE TABLE IF NOT EXISTS vantage_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    vantage_id VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    finding_count INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vantage_runs_scan_id ON vantage_runs(scan_id);

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL DEFAULT 'system',
    target VARCHAR(255),
    scan_id UUID,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detail JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_events_ts ON audit_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_scan_id ON audit_events(scan_id);

CREATE TABLE IF NOT EXISTS watch_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target VARCHAR(255) NOT NULL UNIQUE,
    interval_hours INT NOT NULL DEFAULT 24,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    webhook_url TEXT,
    push_subscription JSONB
);

CREATE TABLE IF NOT EXISTS shadow_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target VARCHAR(255) NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vantages JSONB NOT NULL DEFAULT '[]'::jsonb,
    matrix JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_shadow_snapshots_target ON shadow_snapshots(target, saved_at DESC);
