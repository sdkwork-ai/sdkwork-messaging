-- Default email channel initialization data for the canonical installation
-- tenant (100001) / organization (0), matching the messaging PC application
-- manifest (`apps/sdkwork-messaging-pc/agent.app.config.json#backend`).
--
-- Purpose: an installation starts with every supported email provider already
-- present in `/admin/notify/email`. Each account carries the provider's
-- documented send (SMTP or HTTP API) and receive (IMAP/POP3) presets, so the
-- operator only fills in the login account and the authorization
-- code/password and flips the switches. Nothing must be typed from scratch.
--
-- Contract rules honored here:
--   * DATABASE_SPEC §6.4 — reserved, deterministic ids in a dedicated
--     `9500000xxxxx` block (far below the runtime snowflake space) and stable
--     uuids, so upgrades and retries stay idempotent.
--   * DATABASE_SPEC §6.5 — actor audit columns stay NULL for the system actor
--     and `version` starts at 0, matching the optimistic-concurrency baseline.
--   * DATABASE_FRAMEWORK_SPEC §8.3 — every statement is idempotent
--     (`ON CONFLICT DO NOTHING`); re-seeding never overwrites operator edits.
--   * DATABASE_FRAMEWORK_SPEC §8.2 — only language-neutral machine data lives
--     here; localized provider labels come from the frontend i18n catalog.
--   * No credential material is seeded: secrets are entered by the operator and
--     stored only as ciphertext by the backend.
--
-- The provider presets below must stay in sync with
-- `apps/sdkwork-messaging-pc/packages/sdkwork-messaging-pc-admin-notify/src/emailProviderCatalog.ts`
-- (enforced by `emailProviderCatalog.test.ts`).
--
-- Reserved id blocks:
--   950000000101..950000000112  provider accounts
--   950000000201..950000000212  sender identities (one per provider account)
--   950000000301..950000000304  scenario send rules

-- 1. Provider accounts: presets for send and receive, disabled until configured.
INSERT INTO messaging_email_account (
    id, uuid, tenant_id, organization_id, name, provider, config_json,
    enabled, receive_enabled, created_at, updated_at
)
VALUES
    (
        950000000101, 'seed-messaging-email-account-tencent-mail', 100001, 0,
        'Tencent Mail', 'tencent_mail',
        '{"transport":"smtp","host":"smtp.qq.com","port":"465","encryption":"ssl","receiveProtocol":"imap","imapHost":"imap.qq.com","imapPort":"993","imapEncryption":"ssl","pop3Host":"pop.qq.com","pop3Port":"995","pop3Encryption":"ssl"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000102, 'seed-messaging-email-account-mail-139', 100001, 0,
        '139 Mail', 'mail_139',
        '{"transport":"smtp","host":"smtp.139.com","port":"465","encryption":"ssl","receiveProtocol":"imap","imapHost":"imap.139.com","imapPort":"993","imapEncryption":"ssl","pop3Host":"pop.139.com","pop3Port":"995","pop3Encryption":"ssl"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000103, 'seed-messaging-email-account-gmail', 100001, 0,
        'Gmail', 'gmail',
        '{"transport":"smtp","host":"smtp.gmail.com","port":"465","encryption":"ssl","receiveProtocol":"imap","imapHost":"imap.gmail.com","imapPort":"993","imapEncryption":"ssl","pop3Host":"pop.gmail.com","pop3Port":"995","pop3Encryption":"ssl"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000104, 'seed-messaging-email-account-microsoft', 100001, 0,
        'Microsoft Mail', 'microsoft',
        '{"transport":"smtp","host":"smtp.office365.com","port":"587","encryption":"starttls","receiveProtocol":"imap","imapHost":"outlook.office365.com","imapPort":"993","imapEncryption":"ssl","pop3Host":"outlook.office365.com","pop3Port":"995","pop3Encryption":"ssl"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000105, 'seed-messaging-email-account-aliyun', 100001, 0,
        'Alibaba Cloud DirectMail', 'aliyun',
        '{"transport":"smtp","host":"smtpdm.aliyun.com","port":"465","encryption":"ssl","receiveProtocol":"none"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000106, 'seed-messaging-email-account-tencent', 100001, 0,
        'Tencent Cloud SES', 'tencent',
        '{"transport":"smtp","host":"smtp.qcloudmail.com","port":"465","encryption":"ssl","receiveProtocol":"none"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000107, 'seed-messaging-email-account-amazon-ses', 100001, 0,
        'Amazon SES', 'amazon_ses',
        '{"transport":"smtp","host":"email-smtp.us-east-1.amazonaws.com","port":"465","encryption":"ssl","region":"us-east-1","receiveProtocol":"none"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000108, 'seed-messaging-email-account-sendgrid', 100001, 0,
        'SendGrid', 'sendgrid',
        '{"transport":"http_api","apiBaseUrl":"https://api.sendgrid.com","receiveProtocol":"none"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000109, 'seed-messaging-email-account-mailgun', 100001, 0,
        'Mailgun', 'mailgun',
        '{"transport":"http_api","apiBaseUrl":"https://api.mailgun.net","region":"us","receiveProtocol":"none"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000110, 'seed-messaging-email-account-postmark', 100001, 0,
        'Postmark', 'postmark',
        '{"transport":"http_api","apiBaseUrl":"https://api.postmarkapp.com","receiveProtocol":"none"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000111, 'seed-messaging-email-account-resend', 100001, 0,
        'Resend', 'resend',
        '{"transport":"http_api","apiBaseUrl":"https://api.resend.com","receiveProtocol":"none"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000112, 'seed-messaging-email-account-smtp', 100001, 0,
        'Generic SMTP', 'smtp',
        '{"transport":"smtp","host":"","port":"465","encryption":"ssl","receiveProtocol":"none"}'::jsonb,
        FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;

-- 2. One sender identity per provider account. The placeholder address uses the
--    RFC 2606 reserved documentation domain and is intentionally not enabled:
--    the operator replaces it with the real mailbox address and enables it.
INSERT INTO messaging_email_sender (
    id, uuid, tenant_id, organization_id, account_id, from_address, from_name,
    enabled, created_at, updated_at
)
VALUES
    (950000000201, 'seed-messaging-email-sender-tencent-mail', 100001, 0, 950000000101, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000202, 'seed-messaging-email-sender-mail-139', 100001, 0, 950000000102, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000203, 'seed-messaging-email-sender-gmail', 100001, 0, 950000000103, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000204, 'seed-messaging-email-sender-microsoft', 100001, 0, 950000000104, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000205, 'seed-messaging-email-sender-aliyun', 100001, 0, 950000000105, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000206, 'seed-messaging-email-sender-tencent', 100001, 0, 950000000106, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000207, 'seed-messaging-email-sender-amazon-ses', 100001, 0, 950000000107, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000208, 'seed-messaging-email-sender-sendgrid', 100001, 0, 950000000108, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000209, 'seed-messaging-email-sender-mailgun', 100001, 0, 950000000109, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000210, 'seed-messaging-email-sender-postmark', 100001, 0, 950000000110, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000211, 'seed-messaging-email-sender-resend', 100001, 0, 950000000111, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000212, 'seed-messaging-email-sender-smtp', 100001, 0, 950000000112, 'no-reply@example.com', 'System Notifications', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 3. One ordered fallback chain per scenario over every seeded sender. Disabled
--    accounts and senders are skipped at delivery time, so enabling a single
--    provider is enough to make the scenario routable. The rules start disabled
--    so an installation never sends through an unconfigured provider.
INSERT INTO messaging_email_send_rule (
    id, uuid, tenant_id, organization_id, scenario, chain_json, enabled,
    created_at, updated_at
)
VALUES
    (
        950000000301, 'seed-messaging-email-rule-default', 100001, 0, 'default',
        '["950000000201","950000000202","950000000203","950000000204","950000000205","950000000206","950000000207","950000000208","950000000209","950000000210","950000000211","950000000212"]'::jsonb,
        FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000302, 'seed-messaging-email-rule-verification-code', 100001, 0, 'verification_code',
        '["950000000201","950000000202","950000000203","950000000204","950000000205","950000000206","950000000207","950000000208","950000000209","950000000210","950000000211","950000000212"]'::jsonb,
        FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000303, 'seed-messaging-email-rule-system-notification', 100001, 0, 'system_notification',
        '["950000000201","950000000202","950000000203","950000000204","950000000205","950000000206","950000000207","950000000208","950000000209","950000000210","950000000211","950000000212"]'::jsonb,
        FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000304, 'seed-messaging-email-rule-marketing', 100001, 0, 'marketing',
        '["950000000201","950000000202","950000000203","950000000204","950000000205","950000000206","950000000207","950000000208","950000000209","950000000210","950000000211","950000000212"]'::jsonb,
        FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
