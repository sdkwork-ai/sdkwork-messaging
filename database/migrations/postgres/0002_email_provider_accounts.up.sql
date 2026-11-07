-- sdkwork:migration
-- id: 0002_email_provider_accounts
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Introduce multi-provider email sending configuration. Replaces the
--   single-row-per-tenant `messaging_channel` email model with three
--   dedicated tables: `messaging_email_account` (provider accounts, multiple
--   may coexist and be activated independently), `messaging_email_sender`
--   (sender identities bound to an account), and `messaging_email_send_rule`
--   (per-scenario ordered routing chains over enabled senders). The legacy
--   `messaging_channel` email row, when present, is migrated into a default
--   SMTP account plus its configured sender identity; the legacy row itself
--   is kept untouched because the sms channel still reads it.
-- reversible: false
-- rollback: forward-fix (new tables only; no legacy column is dropped or
--   rewritten, so reverting schema changes means dropping the new tables)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS messaging_email_account (
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
    CONSTRAINT ck_messaging_email_account_provider CHECK (provider IN ('smtp', 'aliyun', 'tencent', 'sendgrid', 'mailgun', 'amazon_ses', 'postmark', 'resend')),
    CONSTRAINT uk_messaging_email_account_scope_name UNIQUE (tenant_id, organization_id, name)
);

CREATE TABLE IF NOT EXISTS messaging_email_sender (
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL UNIQUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    account_id BIGINT NOT NULL,
    from_address VARCHAR(320) NOT NULL,
    from_name VARCHAR(192),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    CONSTRAINT fk_messaging_email_sender_account FOREIGN KEY (account_id) REFERENCES messaging_email_account(id),
    CONSTRAINT uk_messaging_email_sender_address UNIQUE (tenant_id, organization_id, account_id, from_address)
);

CREATE TABLE IF NOT EXISTS messaging_email_send_rule (
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
    CONSTRAINT ck_messaging_email_send_rule_scenario CHECK (scenario IN ('default', 'verification_code', 'system_notification', 'marketing')),
    CONSTRAINT uk_messaging_email_send_rule_scope_scenario UNIQUE (tenant_id, organization_id, scenario)
);

CREATE INDEX IF NOT EXISTS idx_messaging_email_account_scope_enabled
    ON messaging_email_account (tenant_id, organization_id, enabled, updated_at);

CREATE INDEX IF NOT EXISTS idx_messaging_email_sender_scope_account
    ON messaging_email_sender (tenant_id, organization_id, account_id, enabled, updated_at);

CREATE INDEX IF NOT EXISTS idx_messaging_email_send_rule_scope_scenario
    ON messaging_email_send_rule (tenant_id, organization_id, scenario, enabled);

-- Backfill: legacy email channel row -> default SMTP account + sender identity.
-- Secret ciphertext/key_id/fingerprint columns are copied verbatim; the codec
-- derives its key from the master secret only, so existing values stay
-- decryptable. Runs at most once per (tenant, organization) thanks to the
-- scope-unique account name and the NOT EXISTS guard.
INSERT INTO messaging_email_account (
    id, uuid, tenant_id, organization_id, name, provider, config_json,
    secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at
)
SELECT
    legacy.id, legacy.uuid, legacy.tenant_id, legacy.organization_id, '默认配置', legacy.provider,
    legacy.config_json - 'fromAddress' - 'fromName',
    legacy.secret_ciphertext, legacy.secret_key_id, legacy.secret_fingerprint, legacy.enabled,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM messaging_channel AS legacy
WHERE legacy.channel = 'email'
  AND legacy.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM messaging_email_account AS account
      WHERE account.tenant_id = legacy.tenant_id
        AND account.organization_id = legacy.organization_id
        AND account.name = '默认配置'
        AND account.deleted_at IS NULL
  );

INSERT INTO messaging_email_sender (
    id, uuid, tenant_id, organization_id, account_id, from_address, from_name, enabled, created_at, updated_at
)
SELECT
    legacy.id, legacy.uuid, legacy.tenant_id, legacy.organization_id, account.id,
    legacy.config_json ->> 'fromAddress',
    NULLIF(legacy.config_json ->> 'fromName', ''),
    TRUE,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM messaging_channel AS legacy
JOIN messaging_email_account AS account
  ON account.tenant_id = legacy.tenant_id
 AND account.organization_id = legacy.organization_id
 AND account.name = '默认配置'
 AND account.deleted_at IS NULL
WHERE legacy.channel = 'email'
  AND legacy.deleted_at IS NULL
  AND COALESCE(legacy.config_json ->> 'fromAddress', '') <> ''
  AND NOT EXISTS (
      SELECT 1 FROM messaging_email_sender AS sender
      WHERE sender.tenant_id = legacy.tenant_id
        AND sender.organization_id = legacy.organization_id
        AND sender.account_id = account.id
        AND sender.from_address = legacy.config_json ->> 'fromAddress'
        AND sender.deleted_at IS NULL
  );

COMMIT;
