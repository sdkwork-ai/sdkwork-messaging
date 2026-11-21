-- sdkwork:migration
-- id: 0005_legacy_hardening
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Round-2 hardening of the legacy messaging tables, applying the
--   same DATABASE_SPEC pattern the multi-provider tables received in 0004:
--   1. `messaging_push_message` and `messaging_outbound_message` gain
--      soft-delete columns — the admin store's list queries already filter
--      `deleted_at IS NULL`, which failed at runtime without these columns.
--   2. Soft-delete-aware uniqueness (§6.6/DB017): the table-level UNIQUE
--      constraints on the four soft-delete tables plus the two newly
--      soft-delete-capable tables become partial unique indexes over live
--      rows, so a soft-deleted key/idempotency/device/template code can be
--      recreated.
--   3. Actor audit (§6.5): `updated_by` on the mutable lifecycle tables.
--   4. Stable list ordering (§10): the configuration/template list-supporting
--      indexes gain `id` as the tie-breaker for `ORDER BY updated_at DESC`.
-- reversible: false
-- rollback: forward-fix (the unique-index conversion changes which duplicate
--   rows are representable; restoring table-level constraints after
--   soft-deleted duplicates exist would require a dedup pass)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

-- 1. Soft-delete columns for push_message / outbound_message.
ALTER TABLE messaging_push_message ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messaging_push_message ADD COLUMN IF NOT EXISTS deleted_by BIGINT;
ALTER TABLE messaging_outbound_message ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messaging_outbound_message ADD COLUMN IF NOT EXISTS deleted_by BIGINT;

-- 2. Actor-audit columns (§6.5).
ALTER TABLE messaging_notification ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE messaging_announcement ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE messaging_push_message ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE messaging_outbound_message ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE messaging_template ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE messaging_verification_policy ADD COLUMN IF NOT EXISTS updated_by BIGINT;

-- 3. Soft-delete-aware uniqueness (§6.6/DB017).
ALTER TABLE messaging_notification DROP CONSTRAINT IF EXISTS uk_messaging_notification_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_notification_idempotency
    ON messaging_notification (tenant_id, organization_id, idempotency_key)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_notification DROP CONSTRAINT IF EXISTS uk_messaging_notification_key;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_notification_key
    ON messaging_notification (tenant_id, organization_id, notification_key)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_announcement DROP CONSTRAINT IF EXISTS uk_messaging_announcement_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_announcement_idempotency
    ON messaging_announcement (tenant_id, organization_id, idempotency_key)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_announcement DROP CONSTRAINT IF EXISTS uk_messaging_announcement_key;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_announcement_key
    ON messaging_announcement (tenant_id, organization_id, announcement_key)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_push_device DROP CONSTRAINT IF EXISTS uk_messaging_push_device_key;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_push_device_key
    ON messaging_push_device (tenant_id, organization_id, user_id, device_key)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_template DROP CONSTRAINT IF EXISTS uk_messaging_template_scope_code;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_template_scope_code
    ON messaging_template (tenant_id, organization_id, channel, template_code)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_push_message DROP CONSTRAINT IF EXISTS uk_messaging_push_message_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_push_message_idempotency
    ON messaging_push_message (tenant_id, organization_id, idempotency_key)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_push_message DROP CONSTRAINT IF EXISTS uk_messaging_push_message_key;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_push_message_key
    ON messaging_push_message (tenant_id, organization_id, push_key)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_outbound_message DROP CONSTRAINT IF EXISTS uk_messaging_outbound_message_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_outbound_message_idempotency
    ON messaging_outbound_message (tenant_id, organization_id, idempotency_key)
    WHERE deleted_at IS NULL;

-- 4. Stable list ordering tie-breakers (§10).
DROP INDEX IF EXISTS idx_messaging_email_account_scope_enabled;
CREATE INDEX IF NOT EXISTS idx_messaging_email_account_scope_enabled
    ON messaging_email_account (tenant_id, organization_id, enabled, updated_at, id);

DROP INDEX IF EXISTS idx_messaging_email_sender_scope_account;
CREATE INDEX IF NOT EXISTS idx_messaging_email_sender_scope_account
    ON messaging_email_sender (tenant_id, organization_id, account_id, enabled, updated_at, id);

DROP INDEX IF EXISTS idx_messaging_sms_account_scope_enabled;
CREATE INDEX IF NOT EXISTS idx_messaging_sms_account_scope_enabled
    ON messaging_sms_account (tenant_id, organization_id, enabled, updated_at, id);

DROP INDEX IF EXISTS idx_messaging_sms_signature_scope_account;
CREATE INDEX IF NOT EXISTS idx_messaging_sms_signature_scope_account
    ON messaging_sms_signature (tenant_id, organization_id, account_id, enabled, updated_at, id);

DROP INDEX IF EXISTS idx_messaging_template_channel_status;
CREATE INDEX IF NOT EXISTS idx_messaging_template_channel_status
    ON messaging_template (tenant_id, organization_id, channel, status, updated_at, id);

COMMIT;
