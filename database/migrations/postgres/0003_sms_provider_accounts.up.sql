-- sdkwork:migration
-- id: 0003_sms_provider_accounts
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Introduce multi-provider SMS sending configuration, mirroring the
--   email model. Replaces the single-row-per-tenant `messaging_channel` sms
--   model with three dedicated tables: `messaging_sms_account` (provider
--   accounts, multiple may coexist and be activated independently),
--   `messaging_sms_signature` (signatures bound to an account — the SMS
--   equivalent of sender identities), and `messaging_sms_send_rule`
--   (per-scenario ordered routing chains over enabled signatures). The
--   legacy `messaging_channel` sms row, when present, is migrated into a
--   default account plus its configured signature; the legacy row itself is
--   kept untouched because nothing reads it anymore and history must not be
--   destroyed. The legacy single-row channel endpoints are retired by the
--   same change that introduces these tables.
-- reversible: false
-- rollback: forward-fix (new tables only; no legacy column is dropped or
--   rewritten, so reverting schema changes means dropping the new tables)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS messaging_sms_account (
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL UNIQUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    name VARCHAR(128) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    secret_ciphertext VARCHAR,
    secret_key_id VARCHAR,
    secret_fingerprint VARCHAR,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    CONSTRAINT ck_messaging_sms_account_provider CHECK (provider IN ('aliyun', 'tencent', 'huawei', 'yuntongxun', 'submail', 'chuanglan', 'twilio', 'generic_http')),
    CONSTRAINT uk_messaging_sms_account_scope_name UNIQUE (tenant_id, organization_id, name)
);

CREATE TABLE IF NOT EXISTS messaging_sms_signature (
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL UNIQUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    account_id BIGINT NOT NULL,
    sign_name VARCHAR(64) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    CONSTRAINT fk_messaging_sms_signature_account FOREIGN KEY (account_id) REFERENCES messaging_sms_account(id),
    CONSTRAINT uk_messaging_sms_signature_scope_name UNIQUE (tenant_id, organization_id, account_id, sign_name)
);

CREATE TABLE IF NOT EXISTS messaging_sms_send_rule (
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL UNIQUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    scenario VARCHAR(64) NOT NULL,
    chain_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    CONSTRAINT ck_messaging_sms_send_rule_scenario CHECK (scenario IN ('default', 'verification_code', 'system_notification', 'marketing')),
    CONSTRAINT uk_messaging_sms_send_rule_scope_scenario UNIQUE (tenant_id, organization_id, scenario)
);

CREATE INDEX IF NOT EXISTS idx_messaging_sms_account_scope_enabled
    ON messaging_sms_account (tenant_id, organization_id, enabled, updated_at);

CREATE INDEX IF NOT EXISTS idx_messaging_sms_signature_scope_account
    ON messaging_sms_signature (tenant_id, organization_id, account_id, enabled, updated_at);

CREATE INDEX IF NOT EXISTS idx_messaging_sms_send_rule_scope_scenario
    ON messaging_sms_send_rule (tenant_id, organization_id, scenario, enabled);

-- Backfill: legacy sms channel row -> default account + signature identity.
-- Secret ciphertext/key_id/fingerprint columns are copied verbatim; the codec
-- derives its key from the master secret only, so existing values stay
-- decryptable. Runs at most once per (tenant, organization) thanks to the
-- scope-unique account name and the NOT EXISTS guard.
INSERT INTO messaging_sms_account (
    id, uuid, tenant_id, organization_id, name, provider, config_json,
    secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at
)
SELECT
    legacy.id, legacy.uuid, legacy.tenant_id, legacy.organization_id, '默认配置', legacy.provider,
    legacy.config_json - 'signName',
    legacy.secret_ciphertext, legacy.secret_key_id, legacy.secret_fingerprint, legacy.enabled,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM messaging_channel AS legacy
WHERE legacy.channel = 'sms'
  AND legacy.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM messaging_sms_account AS account
      WHERE account.tenant_id = legacy.tenant_id
        AND account.organization_id = legacy.organization_id
        AND account.name = '默认配置'
        AND account.deleted_at IS NULL
  );

INSERT INTO messaging_sms_signature (
    id, uuid, tenant_id, organization_id, account_id, sign_name, enabled, created_at, updated_at
)
SELECT
    legacy.id, legacy.uuid, legacy.tenant_id, legacy.organization_id, account.id,
    legacy.config_json ->> 'signName',
    TRUE,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM messaging_channel AS legacy
JOIN messaging_sms_account AS account
  ON account.tenant_id = legacy.tenant_id
 AND account.organization_id = legacy.organization_id
 AND account.name = '默认配置'
 AND account.deleted_at IS NULL
WHERE legacy.channel = 'sms'
  AND legacy.deleted_at IS NULL
  AND COALESCE(legacy.config_json ->> 'signName', '') <> ''
  AND NOT EXISTS (
      SELECT 1 FROM messaging_sms_signature AS signature
      WHERE signature.tenant_id = legacy.tenant_id
        AND signature.organization_id = legacy.organization_id
        AND signature.account_id = account.id
        AND signature.sign_name = legacy.config_json ->> 'signName'
        AND signature.deleted_at IS NULL
  );

COMMIT;
