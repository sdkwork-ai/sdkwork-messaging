-- sdkwork:migration
-- id: 0014_more_enterprise_mail_providers
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Extend the enterprise-mailbox vendor set beyond 0013 with the other
--   providers operators actually run, so the customer really can pick their own
--   provider instead of falling back to a hand-edited generic profile.
--
--   Added by this migration:
--     huawei_mail      Huawei Cloud enterprise mail (sparkspace.huaweicloud.com)
--     sina_mail        Sina enterprise mail (smtp.sina.net)
--     exchange_cn      Microsoft 365 / Exchange Online operated by 21Vianet
--                      (partner.outlook.cn; distinct from the global cloud)
--     google_workspace Google Workspace / Gmail (smtp.gmail.com, app password)
--
--   `aliyun_mail` and `tencent_exmail` already exist from 0013. `enterprise_mail`
--   remains the generic bucket for any vendor still not listed.
-- reversible: true
-- rollback: down-migration (refuses while rows use a value added here)
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
            -- Enterprise mailbox vendors (0013 + 0014).
            'tencent_exmail',
            'aliyun_mail',
            'netease_qiye',
            'mail_263',
            'coremail',
            'lark_mail',
            'exchange_online',
            'exchange_cn',
            'sohu_mail',
            'huawei_mail',
            'sina_mail',
            'google_workspace',
            -- Consumer mailboxes.
            'tencent_mail',
            'mail_139',
            'gmail',
            'microsoft',
            -- Delivery services.
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
