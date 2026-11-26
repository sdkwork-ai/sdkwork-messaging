-- sdkwork:migration
-- id: 0011_email_account_provider_account
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Revert the cloud-account binding added to messaging_email_account.
--   Safe because the binding is additive: the send path falls back to the local
--   credential ciphertext whenever `provider_account_id` is absent, so dropping
--   the column restores the pre-migration behaviour without touching secrets.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS idx_messaging_email_account_provider_account;

ALTER TABLE messaging_email_account
    DROP CONSTRAINT IF EXISTS ck_messaging_email_account_provider_account_id;

ALTER TABLE messaging_email_account
    DROP COLUMN IF EXISTS provider_account_id;

COMMIT;
