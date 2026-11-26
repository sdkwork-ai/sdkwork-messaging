-- sdkwork:migration
-- id: 0012_sms_account_provider_account
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Give SMS provider accounts the same cloud-account binding email
--   accounts have (0011), so an operator can attach an IAM cloud account either
--   on the provider account or on an individual carrier signature.
--
--   Why both levels exist: an SMS provider account usually authenticates with
--   one cloud-account key pair and owns several carrier signatures. Binding at
--   account level means "all signatures of this provider use that cloud
--   account"; binding at signature level (0010) overrides it for one brand that
--   lives in a different cloud account. Resolution order is therefore:
--     signature binding -> account binding -> local secret ciphertext.
--   Every step is optional, so existing installations keep working untouched.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE messaging_sms_account
    ADD COLUMN IF NOT EXISTS provider_account_id VARCHAR(128);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_messaging_sms_account_provider_account_id'
    ) THEN
        ALTER TABLE messaging_sms_account
            ADD CONSTRAINT ck_messaging_sms_account_provider_account_id
            CHECK (
                provider_account_id IS NULL
                OR provider_account_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{1,127}$'
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messaging_sms_account_provider_account
    ON messaging_sms_account (provider_account_id)
    WHERE provider_account_id IS NOT NULL;

COMMIT;
