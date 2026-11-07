-- sdkwork:migration
-- id: 0004_config_hardening
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Commercial-readiness hardening of the multi-provider email/SMS
--   configuration schema (DATABASE_SPEC §6.5, §6.6/DB017, §17, §22):
--   1. Add `updated_by` actor-audit columns to the six configuration tables.
--   2. Convert the scope-unique table constraints to partial unique indexes
--      over live rows (`WHERE deleted_at IS NULL`) so a soft-deleted account
--      name / sender address / signature can be recreated (DB017).
--   3. Retire `messaging_channel`: the legacy single-row channel surface was
--      fully migrated into messaging_email_account (0002) and
--      messaging_sms_account (0003) and no code reads the table anymore
--      (DB030 evidence: zero references outside this module's own migration
--      history). The drop is pre-GA (baseline folds the same change).
-- reversible: false
-- rollback: forward-fix (the unique-index conversion changes which duplicate
--   rows are representable, so restoring the table constraints after
--   soft-deleted duplicates exist would require a dedup pass; the dropped
--   messaging_channel data is recoverable only up to the 0002/0003
--   migrations' last application)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

-- 1. Actor-audit columns (§6.5).
ALTER TABLE messaging_email_account ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE messaging_email_sender ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE messaging_email_send_rule ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE messaging_sms_account ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE messaging_sms_signature ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE messaging_sms_send_rule ADD COLUMN IF NOT EXISTS updated_by BIGINT;

-- 2. Soft-delete-aware uniqueness (DB017): replace table-level UNIQUE
--    constraints with partial unique indexes over live rows.
ALTER TABLE messaging_email_account DROP CONSTRAINT IF EXISTS uk_messaging_email_account_scope_name;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_email_account_scope_name
    ON messaging_email_account (tenant_id, organization_id, name)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_email_sender DROP CONSTRAINT IF EXISTS uk_messaging_email_sender_address;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_email_sender_address
    ON messaging_email_sender (tenant_id, organization_id, account_id, from_address)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_email_send_rule DROP CONSTRAINT IF EXISTS uk_messaging_email_send_rule_scope_scenario;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_email_send_rule_scope_scenario
    ON messaging_email_send_rule (tenant_id, organization_id, scenario)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_sms_account DROP CONSTRAINT IF EXISTS uk_messaging_sms_account_scope_name;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_sms_account_scope_name
    ON messaging_sms_account (tenant_id, organization_id, name)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_sms_signature DROP CONSTRAINT IF EXISTS uk_messaging_sms_signature_scope_name;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_sms_signature_scope_name
    ON messaging_sms_signature (tenant_id, organization_id, account_id, sign_name)
    WHERE deleted_at IS NULL;

ALTER TABLE messaging_sms_send_rule DROP CONSTRAINT IF EXISTS uk_messaging_sms_send_rule_scope_scenario;
CREATE UNIQUE INDEX IF NOT EXISTS uk_messaging_sms_send_rule_scope_scenario
    ON messaging_sms_send_rule (tenant_id, organization_id, scenario)
    WHERE deleted_at IS NULL;

-- 3. Retire the legacy single-row channel table (§22 contract; DB030 evidence:
--    consumers migrated by 0002/0003, zero remaining readers).
DROP TABLE IF EXISTS messaging_channel;

COMMIT;
