-- sdkwork:migration
-- id: 0011_email_account_provider_account
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Give email provider accounts the same reusable-cloud-account binding
--   SMS signatures already have (migration 0010). Until now an email account
--   could only carry its own encrypted `secret_ciphertext`, so pointing email
--   at a provider account managed in the IAM account center required copying
--   credentials into messaging — the exact duplication the account center
--   exists to remove.
--
--   The binding lives on the account row here (not the sender identity) because
--   an email provider account *is* the upstream credential holder: one SMTP /
--   API account owns many sender addresses, and they all authenticate with the
--   same account secret. SMS differs because a carrier signature is the unit a
--   carrier approves. Both follow the same precedence rule:
--   cloud account first, local ciphertext fallback, so existing installations
--   keep working unchanged.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE messaging_email_account
    ADD COLUMN IF NOT EXISTS provider_account_id VARCHAR(128);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_messaging_email_account_provider_account_id'
    ) THEN
        ALTER TABLE messaging_email_account
            ADD CONSTRAINT ck_messaging_email_account_provider_account_id
            CHECK (
                provider_account_id IS NULL
                OR provider_account_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{1,127}$'
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messaging_email_account_provider_account
    ON messaging_email_account (provider_account_id)
    WHERE provider_account_id IS NOT NULL;

COMMIT;
