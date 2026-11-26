-- sdkwork:migration
-- id: 0010_sms_signature_provider_account
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Let an SMS signature reference a reusable cloud account held by the
--   IAM platform account center (iam_provider_account) instead of every
--   signature configuration carrying its own private credential copy. This
--   follows the established consuming-domain pattern used by drive object
--   storage: one account is created and rotated once in the IAM account
--   center, and every consuming business references it by id.
--
--   The binding intentionally lives on the signature row, not the account row,
--   because a carrier signature is the unit an operator actually provisions:
--   one provider account may own several approved signatures, and they may be
--   backed by different cloud accounts (for example one Tencent Cloud project
--   per brand). Binding at signature level keeps that mapping explicit.
--
--   Credential precedence is cloud-account first with a local-ciphertext
--   fallback: when `provider_account_id` is set the send path resolves the
--   secret through the IAM account center, otherwise it keeps using
--   `messaging_sms_account.secret_ciphertext`. Existing installations therefore
--   keep working unchanged, and no secret is copied between modules.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE messaging_sms_signature
    ADD COLUMN IF NOT EXISTS provider_account_id VARCHAR(128);

-- A bound account id must look like an IAM provider account id. The value is a
-- text id owned by another module, so it is validated syntactically here rather
-- than via a cross-module foreign key (the IAM tables live in their own schema
-- and must stay independently deployable).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_messaging_sms_signature_provider_account_id'
    ) THEN
        ALTER TABLE messaging_sms_signature
            ADD CONSTRAINT ck_messaging_sms_signature_provider_account_id
            CHECK (
                provider_account_id IS NULL
                OR provider_account_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{1,127}$'
            );
    END IF;
END $$;

-- Lookup path for the send-time credential resolver: given the signature, find
-- the bound cloud account without scanning the signature table.
CREATE INDEX IF NOT EXISTS idx_messaging_sms_signature_provider_account
    ON messaging_sms_signature (provider_account_id)
    WHERE provider_account_id IS NOT NULL;

-- Credential-readiness probe used by the console and the send path.
--
-- The IAM account center lives in its own schema and the messaging module must
-- stay independently deployable, so this cannot be a plain query: PostgreSQL
-- resolves every referenced relation at parse time, and a static reference to
-- `iam_provider_credential` raises `42P01 relationship does not exist` even when
-- it sits behind a `to_regclass` guard. The EXECUTE below defers resolution to
-- run time, so an installation without the IAM module simply reports "not
-- ready" instead of failing every signature read.
CREATE OR REPLACE FUNCTION messaging_provider_account_ready(p_account_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    ready BOOLEAN := FALSE;
BEGIN
    IF p_account_id IS NULL OR btrim(p_account_id) = '' THEN
        RETURN FALSE;
    END IF;
    IF to_regclass('iam_provider_credential') IS NULL THEN
        RETURN FALSE;
    END IF;
    EXECUTE
        'SELECT EXISTS (SELECT 1 FROM iam_provider_credential c '
        'WHERE c.provider_account_id = $1 AND c.status = ''active'' '
        'AND c.deleted_at IS NULL)'
    INTO ready
    USING p_account_id;
    RETURN COALESCE(ready, FALSE);
END;
$$;

COMMIT;
