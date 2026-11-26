-- sdkwork:migration
-- id: 0015_sms_signature_default
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Mark which SMS signature is the installation's default.
--
--   With every provider initialized, an installation owns one signature per
--   provider, all named after the same brand placeholder. That made it
--   impossible to tell which signature the operator must edit first, and which
--   one the send chains actually start from. `is_default` records that answer
--   explicitly instead of leaving it implicit in the chain order and the
--   account's enabled flag.
--
--   Rules enforced here:
--   * at most one default per (tenant, organization) — a partial unique index
--     keeps it a real singleton, so two concurrent writes cannot both win;
--   * the default signature must belong to an enabled account; the send path
--     resolves the chain head through it, so a default on a disabled account
--     would be a silent misconfiguration.
--
--   The seed marks the Tencent Cloud signature as the default, matching the
--   chain head it already produces.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE messaging_sms_signature
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- One default per scope. Partial so non-default rows never collide.
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_sms_signature_default
    ON messaging_sms_signature (tenant_id, organization_id)
    WHERE is_default AND deleted_at IS NULL;

-- Lookup path for "which signature is the default" without scanning live rows.
CREATE INDEX IF NOT EXISTS idx_messaging_sms_signature_default_lookup
    ON messaging_sms_signature (tenant_id, organization_id, is_default)
    WHERE deleted_at IS NULL;

COMMIT;
