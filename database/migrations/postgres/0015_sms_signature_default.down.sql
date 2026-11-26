-- sdkwork:migration
-- id: 0015_sms_signature_default
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Remove the SMS signature default marker.
--
--   Safe because the marker is additive metadata: send chains already encode
--   their order independently, so dropping the column restores pre-0015
--   behaviour without touching delivery.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS idx_messaging_sms_signature_default_lookup;

DROP INDEX IF EXISTS uk_messaging_sms_signature_default;

ALTER TABLE messaging_sms_signature
    DROP COLUMN IF EXISTS is_default;

COMMIT;
