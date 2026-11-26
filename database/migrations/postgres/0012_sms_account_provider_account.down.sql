-- sdkwork:migration
-- id: 0012_sms_account_provider_account
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Revert the cloud-account binding added to messaging_sms_account.
--   Safe because the binding is additive: the send path falls back to the
--   signature binding and then to the local secret ciphertext, so dropping the
--   column restores the previous behaviour without touching any secret.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS idx_messaging_sms_account_provider_account;

ALTER TABLE messaging_sms_account
    DROP CONSTRAINT IF EXISTS ck_messaging_sms_account_provider_account_id;

ALTER TABLE messaging_sms_account
    DROP COLUMN IF EXISTS provider_account_id;

COMMIT;
