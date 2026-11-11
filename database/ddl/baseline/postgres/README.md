# PostgreSQL baseline DDL

`0001_messaging_baseline.sql` is the primary bootstrap anchor for the
`messaging` module (`baselineStrategy: baseline-plus-migrations`). It is a
**consolidated pre-GA snapshot**: it already expresses the end state of the
ordered migrations below, so it is the complete active table inventory
(20 tables) that the contract materializer reads.

A fresh install applies this baseline **followed by every ordered migration** in
`../../migrations/postgres/`:

- `0002`/`0003` use `CREATE TABLE IF NOT EXISTS` plus legacy backfills, so they
  are no-ops on this baseline but remain load-bearing for databases built from
  an earlier baseline.
- `0004` retires the legacy `messaging_channel` table.
- `0005`/`0006` add the audit, soft-delete and `receive_enabled` columns with
  `IF NOT EXISTS`; they are no-ops on this baseline.
- `0000`/`0007` recreate and retire the legacy `messaging_channel` shape so the
  0002/0003 backfills can replay on any fresh database.
- `0008` accepts the `enterprise_mail` provider and is a no-op on this baseline.

Governance note: `DATABASE_FRAMEWORK_SPEC.md` §7.5 requires the baseline to stay
immutable and migration history to stay load-bearing. This repository
consolidated the baseline pre-GA because the contract materializer consumes a
single baseline file; the ordered migrations are retained and remain part of
every fresh install. New schema changes `MUST` be added as new migrations from
here on, not folded into this anchor.
