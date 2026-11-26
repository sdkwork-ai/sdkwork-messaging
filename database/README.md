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

## Email channel initialization

The `standard` profile pre-builds the whole email channel so a fresh install only
needs the mailbox credential:

- **13 provider accounts** (`messaging_email_account`) — one per supported
  provider, each carrying the provider's documented send (SMTP or HTTP API) and
  receive (IMAP/POP3) presets.
- **13 sender identities** (`messaging_email_sender`), one per provider, all on
  the installation domain with one consistent display name.
- **4 scenario routing chains** (`messaging_email_send_rule`), each ordered
  enterprise-mail-first and resolvable to real senders.

**Enterprise mail is the default sender and is the Tencent Exmail profile**: the
`enterprise_mail` account ships with `smtp.exmail.qq.com` /
`imap.exmail.qq.com` / `pop.exmail.qq.com` and a preset login
(`no-reply@birdcoder.com`), and only its account, sender and routing step start
enabled. Every other provider starts disabled so it can be switched on
deliberately. The operator therefore only supplies the mailbox password /
authorization code — no endpoint, sender or routing work is required.

Each provider can also be (re)initialized individually from the console
(`initializeEmailProvider`, the same one-click flow SMS has); it fills only
missing preset keys, reuses existing identities, and never overwrites configured
credentials.

## SMS channel initialization

The `standard` profile pre-builds the whole SMS channel so a fresh install only
needs one manual step:

- **8 provider accounts** (`messaging_sms_account`), one per supported provider,
  each carrying the provider's documented endpoint and region preset.
- **8 signatures** (`messaging_sms_signature`), exactly one per provider, so the
  operator never has to create the shape by hand.
- **4 scenario routing chains** (`messaging_sms_send_rule`: `default`,
  `verification_code`, `system_notification`, `marketing`), each ordered
  Tencent-Cloud-first and resolvable to real signatures.

Only **Tencent Cloud** is enabled by default (account + signature + rules); every
other provider starts disabled so it can be switched on deliberately.

### Binding a cloud account

Signatures reference a reusable cloud account from the IAM platform account
center through `messaging_sms_signature.provider_account_id` (migration `0010`),
instead of every signature carrying its own private credential copy. The binding
lives on the signature because that is the unit an operator provisions: one
provider account may own several approved signatures backed by different cloud
accounts.

The seeds leave `provider_account_id` empty on purpose — credentials must never
be pre-seeded and the IAM account center owns those rows. Binding the Tencent
Cloud signature to its IAM cloud account in the console is the only manual step
before SMS can deliver.

Credential precedence is **cloud account first, local ciphertext fallback**:

- with a binding, the send path resolves the secret through
  `messaging_provider_account_ready(...)`, which reports whether the bound
  account holds an active credential;
- without one, the existing `messaging_sms_account.secret_ciphertext` is used, so
  existing installations keep working unchanged.

`messaging_provider_account_ready` resolves the IAM tables at run time
(`EXECUTE`), so an installation without the IAM module reports "not ready"
instead of failing every signature read.

## Seeded template catalog

The `standard` profile ships a complete, operator-editable template catalog for
the canonical installation scope (tenant `100001` / organization `0`), covering
both channels so a fresh install can go live with a copy edit:

- **Email** — 38 provider-agnostic templates, `active` on install. They cover
  the whole transactional backbone commercial deployments are expected to ship:
  - account and security: login/registration codes, **forgot-password request**
    and **reset confirmation**, password-changed notice, **registration success
    (welcome)**, email verification, phone bound, new sign-in alert, account
    frozen/restored;
  - orders and billing: created/paid/failed/shipped/completed/cancelled/
    refunded, top-up, low balance, arrears, invoice ready/overdue;
  - subscription and membership, usage and quota, platform operations
    (maintenance, release, ticket reply), partner, and marketing.

  Every body is self-contained responsive HTML with inline styles and one shared
  visual shell, so re-branding is a copy edit rather than a design project.
- **SMS** — 61 templates mirroring the same business areas at message-brief
  length, each a ready-to-edit body with stable `{{variable}}` placeholders.

SMS rows intentionally start as `draft` with `approval_status = 'pending'`
because carriers must approve the signature and template first; email rows start
`active` because providers render the stored body locally. Every seeded template
is pre-bound to every provider of its channel
(`002_template_provider_defaults.sql`); SMS bindings await the provider-side
template id, and email bindings start `synced` with a `<provider>:<code>` id.

Content rules enforced by `templateSeed.test.ts`,
`crates/sdkwork-routes-messaging-backend-api/tests/sms_template_seed_postgres.rs`
and the seed verification run:

- every SMS body fits a single billed segment under carrier encoding rules
  (GSM-7 ≤ 160 septets, UCS-2 ≤ 70 characters);
- every email body is inline-styled HTML with no scripts, and every email row
  carries a subject;
- marketing bodies carry an opt-out path (unsubscribe link for email, "Reply
  STOP"/"回 T 退订" for SMS) and transactional bodies never do;
- `variables_json` always matches the placeholders in `subject` + `content`;
- seeded ids are deterministic and unique across every locale seed file, so
  re-seeding is idempotent.


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
