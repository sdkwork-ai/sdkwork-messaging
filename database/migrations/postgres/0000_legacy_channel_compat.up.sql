-- sdkwork:migration
-- id: 0000_legacy_channel_compat
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Restore the retired `messaging_channel` shape during migration
--   replay so a fresh install can apply the ordered migration set.
--   The consolidated baseline (DATABASE_FRAMEWORK_SPEC §7.5) already reflects
--   the post-0004 end state and no longer declares the legacy single-row
--   channel table, but 0002/0003 still backfill from it. Without this
--   compatibility table, `db:init` (baseline followed by every ordered
--   migration) fails with `relation "messaging_channel" does not exist` on a
--   brand-new database.
--   The table is created empty, read by the 0002/0003 backfills (which insert
--   nothing), and retired again by 0004; 0007 drops it for databases that had
--   already applied 0004 before this migration existed.
-- reversible: false
-- rollback: forward-fix (the compatibility table is transient and retired by
--   0004/0007; it carries no data and no application reads it)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS messaging_channel (
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    channel VARCHAR(32) NOT NULL,
    provider VARCHAR(64),
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    secret_ciphertext VARCHAR,
    secret_key_id VARCHAR,
    secret_fingerprint VARCHAR,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

COMMIT;
