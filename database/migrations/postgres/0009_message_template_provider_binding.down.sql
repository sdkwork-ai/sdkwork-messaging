-- sdkwork:migration
-- id: 0009_message_template_provider_binding
-- engine: postgres
-- module: messaging
-- purpose: Reverse 0009_message_template_provider_binding.up.sql by dropping the
--   provider-specific template bindings.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS idx_messaging_template_provider_template;
DROP INDEX IF EXISTS idx_messaging_template_provider_lookup;
DROP TABLE IF EXISTS messaging_template_provider;

COMMIT;
