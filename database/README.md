# MESSAGING Database Module

Canonical lifecycle assets for `sdkwork-messaging` per `DATABASE_FRAMEWORK_SPEC.md`.

- moduleId: `messaging`
- serviceCode: `MESSAGING`
- owner: `messaging-platform`
- tablePrefix: `messaging_`
- role: `authoritative-server`
- PostgreSQL: 16.x (verified on 16.4), UTF-8 encoding, UTC; no PostgreSQL
  extensions are required by the baseline or migrations.
- Related specs: [DATABASE_SPEC.md](../../sdkwork-specs/DATABASE_SPEC.md),
  [DATABASE_FRAMEWORK_SPEC.md](../../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md).

## Initialization state

This module is in **initialization state** for greenfield deployments:

1. **Baseline** — `database/ddl/baseline/{engine}/0001_messaging_baseline.sql` contains the full DDL snapshot.
2. **Migrations** — `database/migrations/{engine}/` is reserved for post-GA incremental schema changes only. It is intentionally empty at initialization.
3. **Drift** — run `pnpm db:drift:check` before release.


## Fresh-install commands

```bash
pnpm run db:init      # baseline + every ordered migration
pnpm run db:seed      # standard profile, zh-CN by default
# or, in one step:
pnpm run db:bootstrap # migrate then seed
```

Packaged CloudRouter deployments do not call these commands: the installer's
explicit lifecycle (`cloudrouterctl install|upgrade|ensure`) bootstraps the
Messaging module through `SDKWORK_MESSAGING_APP_ROOT` with the same `standard`
profile, exactly like the Drive storage module. Applications that were installed
before that convergence can repair a single provider from the admin console:
`POST /backend/v3/api/messaging/{email|sms}/providers/{provider}/initialize`
is idempotent, fills only missing preset config keys, reuses existing identities,
and appends the provider to the four scenario routing chains without overwriting
operator edits.

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


## Contract notes

- Row ids allocate through the platform snowflake service
  (`sdkwork-database-id`, DB-backed node lease); the local monotonic generator is
  the documented fallback only.
- JSONB columns (`config_json`, `chain_json`, payloads) are validated in the Rust
  store layer with typed serde DTOs and existence guards; none carry
  lifecycle/status core fields.
- Verification challenge/attempt retention is `challenge_ttl_plus_30d`, owned by
  the messaging delivery worker.
- `database/contract/schema.yaml` and `table-registry.json` are materialized from
  the baseline; re-run `pnpm db:materialize:contract` after a baseline change.

## Verification commands

```bash
pnpm run db:validate
pnpm run db:materialize:contract
pnpm run db:plan
pnpm run db:status
pnpm run db:drift:check
```

## Commands

```bash
pnpm run db:validate
pnpm run db:materialize:contract
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
```
