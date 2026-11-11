-- sdkwork:migration
-- id: 0007_drop_legacy_channel_compat
-- engine: postgres
-- module: sdkwork-messaging
-- purpose: Retire the `messaging_channel` compatibility table that
--   0000_legacy_channel_compat recreates for migration replay. Fresh installs
--   already drop it in 0004; databases that applied 0004 before 0000 existed
--   only see the compatibility table after 0000, so this migration removes it
--   and leaves every installation at the same post-retirement schema.
-- reversible: false
-- rollback: forward-fix (the table is retired by design; restore it only by
--   authoring a new migration that declares a real owner and consumers)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP TABLE IF EXISTS messaging_channel;

COMMIT;
