-- sdkwork:migration
-- id: 0013_enterprise_mail_providers
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Narrow the email provider enum back to the pre-0013 value set.
--
--   Rows that use a vendor added by 0013 must be migrated by the operator first
--   (re-point them at `enterprise_mail` and re-enter that vendor's endpoints).
--   The migration therefore refuses to run while such rows exist instead of
--   silently failing on the CHECK constraint or losing configuration.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: access-exclusive (constraint swap)
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DO $$
DECLARE
    vendor_rows BIGINT;
BEGIN
    SELECT count(*) INTO vendor_rows
    FROM messaging_email_account
    WHERE provider IN (
        'tencent_exmail',
        'aliyun_mail',
        'netease_qiye',
        'mail_263',
        'coremail',
        'lark_mail',
        'exchange_online',
        'sohu_mail'
    );

    IF vendor_rows > 0 THEN
        RAISE EXCEPTION
            'cannot roll back 0013: % email account(s) still use a vendor added by this migration; re-point them to enterprise_mail first',
            vendor_rows;
    END IF;
END $$;

ALTER TABLE messaging_email_account
    DROP CONSTRAINT IF EXISTS ck_messaging_email_account_provider;

ALTER TABLE messaging_email_account
    ADD CONSTRAINT ck_messaging_email_account_provider CHECK (
        provider IN (
            'smtp',
            'enterprise_mail',
            'aliyun',
            'tencent',
            'tencent_mail',
            'mail_139',
            'gmail',
            'microsoft',
            'sendgrid',
            'mailgun',
            'amazon_ses',
            'postmark',
            'resend'
        )
    );

COMMIT;
