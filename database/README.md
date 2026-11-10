# MESSAGING Database Module

Canonical lifecycle assets for `sdkwork-messaging` per `DATABASE_FRAMEWORK_SPEC.md`.

- moduleId: `messaging`
- serviceCode: `MESSAGING`
- tablePrefix: `messaging_`
- role: `authoritative-server`

## Initialization state

- **baselineStrategy**: `baseline-plus-migrations`.
- **Baseline anchor**: `database/ddl/baseline/postgres/0001_messaging_baseline.sql`
  is the consolidated DDL snapshot (`messaging_notification` is the anchor table).
- **Ordered migration range**: `0000_legacy_channel_compat` …
  `0007_drop_legacy_channel_compat`. A fresh install applies the baseline
  followed by every ordered migration. `0000` recreates the retired
  `messaging_channel` shape because the historical `0002`/`0003` backfills still
  reference it; `0004` retires the table and `0007` retires the compatibility
  copy on databases that had already applied `0004`.
- **Seed profile** (`standard`, default locale `zh-CN`):
  - `common/001_bootstrap.sql` — bootstrap marker.
  - `common/002_email_provider_defaults.sql` — 12 provider accounts, one sender
    identity per account, four scenario send rules.
  - `common/003_sms_provider_defaults.sql` — eight provider accounts, one
    signature per account, four scenario send rules.
  - `locales/zh-CN/001_message_templates.sql` and
    `locales/en-US/001_message_templates.sql` — ten email and ten SMS templates
    per locale (verification, password reset, welcome, payment, subscription,
    quota, security, invoice, marketing).
- **Active seed locales**: `zh-CN`, `en-US`; template rows are locale-specific,
  provider/channel initialization data is language-neutral and lives in
  `seeds/common/`.
- Seeded business rows are disabled/draft by default so an installation never
  sends through unconfigured providers; operators only fill credentials,
  replace placeholder identities, approve SMS templates and flip switches.
- Run `pnpm db:drift:check` before a release.

## Fresh-install commands

```bash
pnpm run db:init      # baseline + every ordered migration
pnpm run db:seed      # standard profile, zh-CN by default
# or, in one step:
pnpm run db:bootstrap # migrate then seed
```

## Verification commands

```bash
pnpm run db:validate
pnpm run db:materialize:contract
pnpm run db:plan
pnpm run db:status
pnpm run db:drift:check
```
