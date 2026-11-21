-- sdkwork:migration
-- id: 0009_message_template_provider_binding
-- engine: postgres
-- module: messaging
-- purpose: Add the many-to-many binding between a message template and each
--   delivery provider. Every provider keeps its own external template id and
--   sync status so the send path can resolve the provider-selected template.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

-- Provider-specific binding for a message template.
--
-- One template can be registered with many providers. Each provider keeps its
-- own external template id (SMS carriers and provider-hosted email templates
-- use different ids for the same business template), sync status, and the last
-- synchronization result. The send path resolves the binding for the provider
-- selected by the routing chain and passes that id to the delivery adapter.

CREATE TABLE IF NOT EXISTS messaging_template_provider (
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL UNIQUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    template_id BIGINT NOT NULL,
    channel VARCHAR(32) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    provider_template_id VARCHAR(192),
    provider_template_name VARCHAR(192),
    sync_status VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
    sync_message VARCHAR(512),
    last_synced_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_messaging_template_provider_template
        FOREIGN KEY (template_id) REFERENCES messaging_template(id),
    CONSTRAINT ck_messaging_template_provider_channel
        CHECK (channel IN ('sms', 'email')),
    CONSTRAINT ck_messaging_template_provider_sync_status
        CHECK (sync_status IN ('not_synced', 'pending_approval', 'synced', 'failed')),
    CONSTRAINT uk_messaging_template_provider_scope
        UNIQUE (tenant_id, organization_id, template_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_messaging_template_provider_lookup
    ON messaging_template_provider (tenant_id, organization_id, channel, provider, sync_status);

CREATE INDEX IF NOT EXISTS idx_messaging_template_provider_template
    ON messaging_template_provider (tenant_id, organization_id, template_id);

COMMIT;
