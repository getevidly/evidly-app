-- ============================================================================
-- Migration: 20260219000000_offline_sync_tables.sql
-- Description: Offline sync infrastructure for multi-device support.
--              Provides device registration, a durable queue for pending
--              mutations, conflict tracking / resolution, and point-in-time
--              snapshots so clients can hydrate after extended offline periods.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. device_registrations
--    One row per device a user has registered for offline-capable access.
-- --------------------------------------------------------------------------
CREATE TABLE device_registrations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name     TEXT        NOT NULL,
    device_type     TEXT        NOT NULL DEFAULT 'web',
    platform        TEXT,
    app_version     TEXT,
    push_token      TEXT,
    last_sync_at    TIMESTAMPTZ,
    sync_version    BIGINT      DEFAULT 0,
    is_active       BOOLEAN     DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_device_registrations_user_id
    ON device_registrations (user_id);

CREATE INDEX idx_device_registrations_user_active
    ON device_registrations (user_id, is_active);

ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 2. sync_queue
--    Durable outbox of mutations recorded while offline.  Processed FIFO
--    within each priority tier.
-- --------------------------------------------------------------------------
CREATE TABLE sync_queue (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       UUID        NOT NULL REFERENCES device_registrations(id) ON DELETE CASCADE,
    organization_id UUID,
    action_type     TEXT        NOT NULL CHECK (action_type IN ('insert', 'update', 'delete')),
    table_name      TEXT        NOT NULL,
    record_id       UUID,
    payload         JSONB       NOT NULL DEFAULT '{}',
    status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority        INTEGER     DEFAULT 0,
    retries         INTEGER     DEFAULT 0,
    max_retries     INTEGER     DEFAULT 3,
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    processed_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_device_id
    ON sync_queue (device_id);

CREATE INDEX idx_sync_queue_status
    ON sync_queue (status);

CREATE INDEX idx_sync_queue_device_status
    ON sync_queue (device_id, status);

CREATE INDEX idx_sync_queue_status_priority_created
    ON sync_queue (status, priority DESC, created_at ASC);

ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 3. sync_conflicts
--    Tracks divergent writes detected during sync so they can be reviewed
--    and resolved (automatically or manually).
-- --------------------------------------------------------------------------
CREATE TABLE sync_conflicts (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id         UUID        NOT NULL REFERENCES device_registrations(id) ON DELETE CASCADE,
    organization_id   UUID,
    table_name        TEXT        NOT NULL,
    record_id         UUID        NOT NULL,
    client_data       JSONB       NOT NULL,
    server_data       JSONB       NOT NULL,
    client_timestamp  TIMESTAMPTZ NOT NULL,
    server_timestamp  TIMESTAMPTZ NOT NULL,
    resolution        TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (resolution IN ('pending', 'client_wins', 'server_wins', 'manual', 'merged')),
    resolved_by       UUID        REFERENCES auth.users(id),
    resolved_at       TIMESTAMPTZ,
    resolution_notes  TEXT,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sync_conflicts_device_id
    ON sync_conflicts (device_id);

CREATE INDEX idx_sync_conflicts_device_resolution
    ON sync_conflicts (device_id, resolution);

CREATE INDEX idx_sync_conflicts_table_record
    ON sync_conflicts (table_name, record_id);

ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 4. sync_snapshots
--    Compressed point-in-time table snapshots a device can use to bootstrap
--    local state without replaying every queued mutation.
-- --------------------------------------------------------------------------
CREATE TABLE sync_snapshots (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id         UUID        NOT NULL REFERENCES device_registrations(id) ON DELETE CASCADE,
    table_name        TEXT        NOT NULL,
    snapshot_data     JSONB       NOT NULL DEFAULT '{}',
    record_count      INTEGER     DEFAULT 0,
    snapshot_version  BIGINT      DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sync_snapshots_device_id
    ON sync_snapshots (device_id);

CREATE INDEX idx_sync_snapshots_device_table
    ON sync_snapshots (device_id, table_name);

ALTER TABLE sync_snapshots ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- Trigger function: set_updated_at
--    Automatically bumps updated_at on row modification.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_device_registrations_updated_at
    BEFORE UPDATE ON device_registrations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
