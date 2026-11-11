-- sdkwork:migration
-- id: 0008_enterprise_mail_provider
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Add the `enterprise_mail` provider used by the default enterprise
--   mailbox initialization data (SMTP/IMAP/POP3 presets with the installation
--   email domain pre-filled). The provider is SMTP-transport based, so only the
--   provider catalog constraint changes; existing providers stay valid.
-- reversible: false
-- rollback: forward-fix (narrowing the constraint would reject rows already
--   persisted with the enterprise_mail provider)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

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
