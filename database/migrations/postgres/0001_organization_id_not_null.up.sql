-- sdkwork:migration
-- id: 0001_organization_id_not_null
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Enforce organization_id NOT NULL DEFAULT on all tables in the
--   consolidated baseline. NULL rows (pre-standard data anomalies) are
--   backfilled with the platform sentinel before NOT NULL is set, and
--   NOT NULL columns without an explicit default receive the sentinel
--   default, keeping existing deployments consistent with fresh baseline
--   installs.
-- reversible: false
-- rollback: forward-fix (sentinel backfill is the canonical fix; NULL
--   organization rows are data anomalies)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

UPDATE messaging_notification SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_notification ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_notification ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_notification_recipient SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_notification_recipient ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_notification_recipient ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_announcement SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_announcement ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_announcement ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_announcement_audience SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_announcement_audience ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_announcement_audience ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_announcement_receipt SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_announcement_receipt ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_announcement_receipt ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_push_device SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_push_device ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_push_device ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_push_message SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_push_message ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_push_message ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_push_delivery SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_push_delivery ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_push_delivery ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_outbound_message SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_outbound_message ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_outbound_message ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_outbound_delivery SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_outbound_delivery ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_outbound_delivery ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_verification_policy SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_verification_policy ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_verification_policy ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_verification_challenge SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_verification_challenge ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_verification_challenge ALTER COLUMN organization_id SET NOT NULL;

UPDATE messaging_verification_attempt SET organization_id = 0 WHERE organization_id IS NULL;
ALTER TABLE messaging_verification_attempt ALTER COLUMN organization_id SET DEFAULT 0;
ALTER TABLE messaging_verification_attempt ALTER COLUMN organization_id SET NOT NULL;

COMMIT;
