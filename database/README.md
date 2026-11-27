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

`database.manifest.json` sets `lifecycle.seedOnBoot: true`, so a boot through
`bootstrap_messaging_database_from_env` seeds the `standard` profile
automatically: the template center, provider presets and verification policies
are present the moment the service starts, with no extra command. Seeding is
idempotent (`ON CONFLICT DO NOTHING`) and never overwrites operator edits, so a
restart on a configured installation is a no-op. Set
`SDKWORK_MESSAGING_SEED_ON_BOOT=false` to opt out for a deployment that manages
its own data lifecycle.

The `standard` profile seeds 160 templates per locale — 77 email and 83 SMS —
covering account security, orders and payments, billing and tax, subscriptions,
team collaboration, API credentials, domains and certificates, storage quotas,
compliance and privacy, partner programmes, marketing, and service status, plus
one provider binding per template.

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

## Verification-code policies

`messaging_verification_policy` is the contract every OTP challenge is created
against: `messaging_verification_challenge` holds a composite foreign key on
`(tenant_id, organization_id, scene_code, channel)` referencing it, so an
installation with **zero** policy rows cannot create a challenge at all —
login / register / password-reset flows fail on the foreign key.

The `standard` profile therefore seeds 14 policies per locale: seven scenes
(`login`, `register`, `password_reset`, `bind_phone`, `payment`, `withdraw`,
`login_mfa`) on both channels. Each row carries:

- a tuned `ttl_seconds` / `max_attempts` pair — shorter windows and fewer
  attempts for high-risk scenes (password reset, payment, withdraw), longer
  windows for ordinary sign-in;
- a `message_body_pattern` using the same `{{code}}` / `{{ttlMinutes}}` tokens as
  the channel templates, plus a subject for email and `NULL` for SMS.

Files: `locales/{zh-CN,en-US}/003_verification_policies.sql`. The operator only
adjusts the numbers or copy, or simply points the flows at a configured
provider, and the OTP journey works.

## Template test send

Both template pages offer **发送测试 / Send test**: it opens a dialog for one
delivery target (email address or phone number), optional values for the
template's variables, and a live preview of the rendered result, then enqueues
one real outbound message through `messaging.outboundMessages.send`.

Delivery notes:

- variables left blank fall back to realistic sample values, so a test never
  sends a raw `{{token}}`;
- the request carries `templateCode` (traceability in send records) and routes
  through the `system_notification` scenario, so a test never consumes marketing
  quota or reputation;
- the button only appears for a saved, clean template — unsaved edits are never
  sent silently.

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

Every row that can own upstream credentials is bindable to a reusable cloud
account from the IAM platform account center, instead of carrying its own
private credential copy:

| Channel | Binding columns | Why |
|---|---|---|
| SMS | `messaging_sms_account.provider_account_id` (0012) | one provider account owns the key pair |
| SMS | `messaging_sms_signature.provider_account_id` (0010) | one brand may live in a different cloud account |
| Email | `messaging_email_account.provider_account_id` (0011) | one SMTP/API account owns many senders |

Resolution order is most-specific-first, with the local secret as the last
fallback, so every layer is optional:

```text
SMS   : signature binding -> account binding -> secret_ciphertext
Email : account binding              -> secret_ciphertext
```

The seeds leave every binding empty on purpose — credentials must never be
pre-seeded and the IAM account center owns those rows. Binding the default
Tencent Cloud signature/account and the Tencent Exmail account in the console is
the only manual step before both channels can deliver.

`messaging_provider_account_ready` resolves the IAM tables at run time
(`EXECUTE`), so an installation without the IAM module reports "not ready"
instead of failing every signature/account read.

## Seeded template catalog

The `standard` profile ships a complete, operator-editable template catalog for
the canonical installation scope (tenant `100001` / organization `0`), covering
both channels so a fresh install can go live with a copy edit: **87 email + 92
SMS = 179 templates per locale**, across thirteen business areas (identity and
verification, account security, orders and payments, billing and tax,
subscriptions and membership, team and organization, API and developer, domains
and certificates, service status, support tickets, partner programme, marketing,
compliance and privacy). See `locales/zh-CN/001_message_templates.sql` for the
authoritative list; `templateSeed.test.ts` keeps both locales in sync.

- **Email** — provider-agnostic HTML templates, `active` on install, each body
  self-contained responsive HTML with inline styles and one shared visual shell
  so re-branding is a copy edit rather than a design project.
- **SMS** — the same business areas at message-brief length, each a ready-to-edit
  body with stable `{{variable}}` placeholders and a single-segment budget.

### Template center renders empty

The admin list query is scoped to the **request** tenant
(`MessagingAdminSubject`, resolved from the authenticated session) while the seed
writes the canonical installation scope above. Two distinct causes look
identical in the UI:

1. **Nothing was seeded** — `lifecycle.seedOnBoot` is false, or a deployment ran
   migrations without seeding. The list is genuinely empty.
2. **Scope mismatch** — rows exist, but the session tenant is not `100001`, so
   the scoped query matches nothing.

Run `pnpm run db:diagnose-templates -- --url <postgres-url>` to tell them apart;
it prints the effective `seedOnBoot`, the seeded scope, and compares both against
the live database. Fix cause 1 with `pnpm run db:seed`; fix cause 2 by either
pointing the installation at tenant `100001` or re-scoping the template rows.

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
