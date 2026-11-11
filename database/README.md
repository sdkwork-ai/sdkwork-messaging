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
  - `common/002_email_provider_defaults.sql` — 13 provider accounts, one sender
    identity per account on the `birdcoder.com` domain, four scenario send
    rules. The `enterprise_mail` account
    (`smtp.exmail.qq.com` / `imap.exmail.qq.com` / `pop.exmail.qq.com`,
    login `no-reply@birdcoder.com`), its sender identity and the four email
    rules are enabled by default; supplying the mailbox password or
    authorization code makes email delivery operational. Every other provider
    stays disabled until configured.
  - `common/003_sms_provider_defaults.sql` — eight provider accounts, one
    `BirdCoder` signature per account, four scenario send rules. Tencent Cloud
    SMS is the default path: its account (`https://sms.tencentcloudapi.com`,
    `ap-guangzhou`), its signature and the four SMS rules are enabled; the
    operator supplies SecretId/SdkAppId/SecretKey and an approved signature.
    Every other SMS provider stays disabled until configured.
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

## Locale selection

`db:seed` and `db:bootstrap` default to `zh-CN` / `standard`. The
`SDKWORK_DATABASE_SEED_LOCALE` topology setting is consumed by boot-time seed
resolution; the CLI takes the locale and profile as explicit flags. For an
English installation pass them through pnpm:

```bash
pnpm run db:seed -- --locale en-US --profile standard
pnpm run db:bootstrap -- --locale en-US --profile standard
```

Choose the installation locale before the first seed. Template codes are
unique per channel, so seeding a second locale over an already seeded scope is
a safe no-op rather than a translation switch; edit the templates or reset the
template rows deliberately if an installation has to change language later.


## Verification commands

```bash
pnpm run db:validate
pnpm run db:materialize:contract
pnpm run db:plan
pnpm run db:status
pnpm run db:drift:check
```
