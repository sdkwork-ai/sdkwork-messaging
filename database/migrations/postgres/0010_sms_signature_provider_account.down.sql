-- sdkwork:migration
-- id: 0010_sms_signature_provider_account
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Revert the cloud-account binding added to
--   messaging_sms_signature. Safe because the binding is additive: the send
--   path falls back to the local credential ciphertext whenever
--   `provider_account_id` is absent, so dropping the column restores the
--   pre-migration behaviour without touching any secret material.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP FUNCTION IF EXISTS messaging_provider_account_ready(TEXT);

DROP INDEX IF EXISTS idx_messaging_sms_signature_provider_account;

ALTER TABLE messaging_sms_signature
    DROP CONSTRAINT IF EXISTS ck_messaging_sms_signature_provider_account_id;

ALTER TABLE messaging_sms_signature
    DROP COLUMN IF EXISTS provider_account_id;

COMMIT;
