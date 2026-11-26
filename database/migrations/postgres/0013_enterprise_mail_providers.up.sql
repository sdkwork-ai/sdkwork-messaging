-- sdkwork:migration
-- id: 0013_enterprise_mail_providers
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Support the enterprise-mailbox vendors operators actually run,
--   instead of one generic `enterprise_mail` row whose endpoints had to be
--   edited by hand into whatever vendor the customer uses.
--
--   A software product should let the customer pick their own enterprise-mail
--   provider, so each vendor becomes a first-class provider with its documented
--   SMTP/IMAP/POP3 endpoints preset. `enterprise_mail` stays in the enum as the
--   compatibility bucket: existing rows keep working and an operator with an
--   unlisted vendor still has a home for a fully custom profile.
--
--   Added: tencent_exmail, aliyun_mail, netease_qiye, mail_263, coremail,
--   lark_mail, exchange_online, sohu_mail.
-- reversible: true
-- rollback: down-migration (drops the new values; rows using them must be
--   migrated to `enterprise_mail` first, which the down migration enforces by
--   refusing to run while such rows exist)
-- transactional: true
-- lock: access-exclusive (constraint swap)
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
            'tencent_exmail',
            'aliyun_mail',
            'netease_qiye',
            'mail_263',
            'coremail',
            'lark_mail',
            'exchange_online',
            'sohu_mail',
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
