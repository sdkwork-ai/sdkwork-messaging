# PostgreSQL migrations

Ordered, post-baseline schema history for the `messaging` module. Files use
`{version}_{name}.up.sql` and are applied after the primary baseline on every
fresh install; a paired `.down.sql` is optional and only for a tested,
data-preserving reversal.

The primary baseline is a consolidated snapshot, so several of these migrations
are intentionally idempotent no-ops on a brand-new database while remaining
load-bearing for databases built from an earlier baseline. They are retained as
lifecycle history and `MUST NOT` be deleted or edited after being applied.

## Current ordered range

| Migration | Effect |
| --- | --- |
| `0000_legacy_channel_compat` | Recreates the empty legacy `messaging_channel` shape so `0002`/`0003` backfills replay on a new database. |
| `0001_organization_id_not_null` | Adds/backfills `organization_id` on the notification, announcement, push, outbound and verification tables. |
| `0002_email_provider_accounts` | Creates email accounts, sender identities and send rules; backfills legacy channel config (no-op on the consolidated baseline). |
| `0003_sms_provider_accounts` | Creates SMS accounts, signatures and send rules; backfills legacy channel config (no-op on the consolidated baseline). |
| `0004_config_hardening` | Email/SMS config hardening columns and indexes; drops the retired `messaging_channel` table. |
| `0005_legacy_hardening` | Audit (`updated_by`) and soft-delete (`deleted_at`, `deleted_by`) columns for legacy tables. |
| `0006_email_provider_expansion` | `receive_enabled` plus the expanded email provider constraint. |
| `0007_drop_legacy_channel_compat` | Retires the compatibility table again on databases that had already applied `0004`. |
| `0008_enterprise_mail_provider` | Accepts the `enterprise_mail` provider used by the default enterprise mailbox seed. |

Every `.up.sql` file carries the metadata header required by
`DATABASE_FRAMEWORK_SPEC.md` §7.2 (engine, module, purpose, rollback strategy,
transactional/lock timeouts). Applied content is checksum-immutable: fix
forward with a new migration, never edit an applied migration.
