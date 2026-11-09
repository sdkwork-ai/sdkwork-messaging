-- sdkwork:migration
-- id: 0006_email_provider_expansion
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Expand the multi-provider email configuration for consumer mailbox
--   services (DATABASE_SPEC §6.4 reserved catalog ids, §22 provider catalog):
--   1. `messaging_email_account.provider` accepts the four consumer mailbox
--      providers that ship ready-made send (SMTP/API) and receive
--      (IMAP/POP3) presets: `tencent_mail` (QQ Mail), `mail_139` (China Mobile
--      139 Mail), `gmail`, and `microsoft` (Outlook / Microsoft 365). The
--      existing cloud-delivery providers stay valid, so the constraint is
--      replaced, never narrowed.
--   2. `receive_enabled` records the per-provider inbound switch next to the
--      existing `enabled` outbound switch. It defaults to FALSE: an installation
--      that seeds provider accounts keeps inbound explicitly opt-in.
-- reversible: false
-- rollback: forward-fix (dropping the column would discard operator toggles;
--   narrowing the provider constraint would reject rows already persisted with
--   the new provider ids)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE messaging_email_account
    ADD COLUMN IF NOT EXISTS receive_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE messaging_email_account
    DROP CONSTRAINT IF EXISTS ck_messaging_email_account_provider;

ALTER TABLE messaging_email_account
    ADD CONSTRAINT ck_messaging_email_account_provider CHECK (
        provider IN (
            'smtp',
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
