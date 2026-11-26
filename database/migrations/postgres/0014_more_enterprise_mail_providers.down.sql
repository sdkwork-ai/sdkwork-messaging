-- sdkwork:migration
-- id: 0014_more_enterprise_mail_providers
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Narrow the email provider enum back to the 0013 value set.
--
--   Refuses to run while rows still use a value added by 0014, so an operator
--   must re-point those accounts (to `enterprise_mail` and its own endpoints)
--   first. That is deliberate: silently dropping accounts or letting the CHECK
--   fail mid-swap would lose configuration.
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
    WHERE provider IN ('huawei_mail', 'sina_mail', 'exchange_cn', 'google_workspace');

    IF vendor_rows > 0 THEN
        RAISE EXCEPTION
            'cannot roll back 0014: % email account(s) still use a provider added by this migration; re-point them to enterprise_mail first',
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
            'tencent_exmail',
            'aliyun_mail',
            'netease_qiye',
            'mail_263',
            'coremail',
            'lark_mail',
            'exchange_online',
            'sohu_mail',
            'tencent_mail',
            'mail_139',
            'gmail',
            'microsoft',
            'aliyun',
            'tencent',
            'sendgrid',
            'mailgun',
            'amazon_ses',
            'postmark',
            'resend'
        )
    );

COMMIT;
