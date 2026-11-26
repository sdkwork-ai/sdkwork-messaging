-- Default SMS channel initialization data for the canonical installation
-- tenant (100001) / organization (0), matching the messaging PC application
-- manifest (`apps/sdkwork-messaging-pc/agent.app.config.json#backend`).
--
-- Purpose: a fresh installation already lists every supported SMS provider in
-- `/admin/notify/sms`, each with the provider's documented endpoint and region,
-- a signature bound to its account, and the four scenario routing chains.
--
-- All eight providers are seeded **enabled** with an enabled signature, so the
-- installation is fully initialized out of the box: the operator only fills in
-- the account identifiers and credential of whichever provider they use, and
-- replaces the placeholder `BirdCoder` signature with the one that provider
-- approved. Nothing has to be created or switched on by hand.
--
-- Routing safety: a provider whose account or signature is enabled but has no
-- credential yet is still listed in every scenario chain, and the rules page
-- marks it "待填凭据 / credentials missing" so the gap is visible. The first
-- chain step that can actually authenticate is the one that delivers; the
-- operator fixes that by entering one credential or disabling the unused
-- providers. Tencent Cloud stays first in every chain, so it remains the
-- default path.
--
-- Contract rules honored here:
--   * DATABASE_SPEC §6.4 — reserved, deterministic ids in the dedicated
--     `9500000xxxxx` block (far below the runtime snowflake space) and stable
--     uuids, so upgrades and retries stay idempotent.
--   * DATABASE_SPEC §6.5 — system-actor audit columns stay NULL and `version`
--     starts at 0, matching the optimistic-concurrency baseline.
--   * DATABASE_FRAMEWORK_SPEC §8.3 — every statement is idempotent
--     (`ON CONFLICT DO NOTHING`); re-seeding never overwrites operator edits.
--   * DATABASE_FRAMEWORK_SPEC §8.2 — only language-neutral machine data lives
--     here; localized provider labels come from the frontend i18n catalog.
--   * No credential material is seeded: secrets are entered by the operator and
--     stored only as ciphertext by the backend.
--
-- The provider presets below must stay in sync with
-- `apps/sdkwork-messaging-pc/packages/sdkwork-messaging-pc-admin-notify/src/smsProviderCatalog.ts`
-- (enforced by `smsProviderCatalog.test.ts`).
--
-- Reserved id blocks:
--   950000000401..950000000408  provider accounts
--   950000000501..950000000508  signature identities (one per provider account)
--   950000000601..950000000604  scenario send rules

-- 1. Provider accounts: documented endpoint/region presets, all enabled so a
--    new installation is ready to configure rather than ready to build. The
--    operator supplies the identifiers/credential for the provider they use.
INSERT INTO messaging_sms_account (
    id, uuid, tenant_id, organization_id, name, provider, config_json,
    enabled, created_at, updated_at
)
VALUES
    (
        950000000401, 'seed-messaging-sms-account-aliyun', 100001, 0,
        'Alibaba Cloud SMS', 'aliyun',
        '{"region":"cn-hangzhou","endpoint":"https://dysmsapi.aliyuncs.com"}'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000402, 'seed-messaging-sms-account-tencent', 100001, 0,
        'Tencent Cloud SMS', 'tencent',
        '{"region":"ap-guangzhou","endpoint":"https://sms.tencentcloudapi.com"}'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000403, 'seed-messaging-sms-account-huawei', 100001, 0,
        'Huawei Cloud SMS', 'huawei',
        '{"region":"cn-north-4","endpoint":"https://smsapi.cn-north-4.myhuaweicloud.com"}'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000404, 'seed-messaging-sms-account-yuntongxun', 100001, 0,
        'Ronglian Cloud', 'yuntongxun',
        '{"endpoint":"https://app.cloopen.com:8883"}'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000405, 'seed-messaging-sms-account-submail', 100001, 0,
        'SUBMAIL', 'submail',
        '{"endpoint":"https://api-v4.mysubmail.com"}'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000406, 'seed-messaging-sms-account-chuanglan', 100001, 0,
        'Chuanglan 253', 'chuanglan',
        '{"endpoint":"https://smssh1.253.com"}'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000407, 'seed-messaging-sms-account-twilio', 100001, 0,
        'Twilio', 'twilio',
        '{"apiBaseUrl":"https://api.twilio.com"}'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000408, 'seed-messaging-sms-account-generic-http', 100001, 0,
        'Generic HTTP SMS', 'generic_http',
        '{}'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;

-- 2. One signature identity per provider account on the BirdCoder brand — every
--    supported provider gets exactly one row so the operator never has to
--    create the shape by hand. All of them are enabled, matching the accounts
--    above: the installation ships fully initialized and the operator edits the
--    `BirdCoder` placeholder into the signature their carrier approved.
--
--    `provider_account_id` (the IAM cloud-account binding, migration 0010) is
--    deliberately left NULL: credentials must never be pre-seeded, and the IAM
--    account center owns those rows. The operator either supplies the provider
--    account credential in "编辑" or binds the signature to an IAM cloud account.
--    Without a binding the send path uses the provider account's own stored
--    credential.
INSERT INTO messaging_sms_signature (
    id, uuid, tenant_id, organization_id, account_id, sign_name, enabled,
    is_default, created_at, updated_at
)
VALUES
    (950000000501, 'seed-messaging-sms-signature-aliyun', 100001, 0, 950000000401, 'BirdCoder', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000502, 'seed-messaging-sms-signature-tencent', 100001, 0, 950000000402, 'BirdCoder', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000503, 'seed-messaging-sms-signature-huawei', 100001, 0, 950000000403, 'BirdCoder', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000504, 'seed-messaging-sms-signature-yuntongxun', 100001, 0, 950000000404, 'BirdCoder', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000505, 'seed-messaging-sms-signature-submail', 100001, 0, 950000000405, 'BirdCoder', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000506, 'seed-messaging-sms-signature-chuanglan', 100001, 0, 950000000406, 'BirdCoder', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000507, 'seed-messaging-sms-signature-twilio', 100001, 0, 950000000407, 'BirdCoder', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (950000000508, 'seed-messaging-sms-signature-generic-http', 100001, 0, 950000000408, 'BirdCoder', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 3. One ordered fallback chain per scenario, Tencent Cloud first. Every chain
--    lists all eight signatures because every provider is initialized; delivery
--    uses the first step that has a usable credential, and the rules page marks
--    a step "待填凭据 / credentials missing" while its provider is still
--    unconfigured. Disabling an unused provider (account or signature) removes
--    it from routing, so the operator can keep the chain to the providers they
--    actually pay for.
INSERT INTO messaging_sms_send_rule (
    id, uuid, tenant_id, organization_id, scenario, chain_json, enabled,
    created_at, updated_at
)
VALUES
    (
        950000000601, 'seed-messaging-sms-rule-default', 100001, 0, 'default',
        '["950000000502","950000000501","950000000503","950000000504","950000000505","950000000506","950000000507","950000000508"]'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000602, 'seed-messaging-sms-rule-verification-code', 100001, 0, 'verification_code',
        '["950000000502","950000000501","950000000503","950000000504","950000000505","950000000506","950000000507","950000000508"]'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000603, 'seed-messaging-sms-rule-system-notification', 100001, 0, 'system_notification',
        '["950000000502","950000000501","950000000503","950000000504","950000000505","950000000506","950000000507","950000000508"]'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000604, 'seed-messaging-sms-rule-marketing', 100001, 0, 'marketing',
        '["950000000502","950000000501","950000000503","950000000504","950000000505","950000000506","950000000507","950000000508"]'::jsonb,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
