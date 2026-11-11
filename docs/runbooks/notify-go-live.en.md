# Runbook — Notification initialization and commercial go-live (English)

Audience: operators and implementation engineers bringing up `sdkwork-messaging`
notification delivery (email + SMS) in a new cluster or environment.

Goal: initialize the database with one command, then change only credentials and
the SMS signature in the console to start sending.

## 1. Prerequisites

1. PostgreSQL 16.x reachable and `SDKWORK_DATABASE_*` configured for `MESSAGING`.
2. **Required**: a channel-secret encryption master key. Never use the built-in
   development key in production:

   ```bash
   # Generate once and store it in the deployment secret manager. Do not rotate casually.
   openssl rand -base64 32
   export SDKWORK_MESSAGING_SECRET_ENCRYPTION_KEY='<generated value>'
   ```

   - Encrypts enterprise mailbox passwords and SMS SecretKeys at rest.
   - After the key changes, stored channel secrets cannot be decrypted and must
     be re-entered; plan a re-entry window before rotating.
3. Confirm the installation tenant is `100001` and organization is `0` (the seed
   data targets that scope, matching CloudRouter `agent.app.config.json`).
   Custom tenants need a separate tenant initialization.

## 2. Initialize the database (one time)

Run before starting the application:

```bash
cd <sdkwork-messaging>
pnpm run db:bootstrap
```

`db:bootstrap` runs `db:init` + `db:seed` and writes:

- the baseline and migrations `0000`–`0008`;
- 13 email provider accounts, 13 sender identities, 4 email rules;
- 8 SMS provider accounts, 8 `BirdCoder` signatures, 4 SMS rules;
- 10 email and 10 SMS templates for the selected locale (`zh-CN` by default).

English installation:

```bash
pnpm run db:bootstrap -- --locale en-US --profile standard
```

For boot-time initialization (first boot only recommended):

```bash
export SDKWORK_DATABASE_AUTO_MIGRATE=true
export SDKWORK_DATABASE_SEED_ON_BOOT=true
export SDKWORK_DATABASE_SEED_LOCALE=zh-CN
export SDKWORK_DATABASE_SEED_PROFILE=standard
```

The application runs init → migrate → seed on startup. In multi-replica
environments run `db:bootstrap` once in a release job instead, so only one
instance writes seed history.

## 3. Verify initialization

```bash
pnpm run db:status
pnpm run db:drift:check
```

Expected: `status=seeded`, `pending_migrations=0`, drift clean.
`/admin/notify/email` shows 13 accounts; `/admin/notify/sms` shows 8 accounts.

## 4. Configure the enterprise mailbox (default email path)

1. Open `/admin/notify/email` → `Enterprise Mail` (already enabled, login
   `no-reply@birdcoder.com`).
2. Enter the mailbox password or client authorization code (Tencent Exmail
   requires enabling the client and generating a dedicated password).
3. If the provider is not Tencent Exmail, adjust the SMTP/IMAP/POP3 endpoints; if
   the sender address differs, replace `no-reply@birdcoder.com` with an enabled
   address.
4. Save. The account, sender identity and four email rules are already enabled.

## 5. Configure Tencent Cloud SMS (default SMS path)

1. Open `/admin/notify/sms` → `Tencent Cloud SMS` (already enabled, endpoint
   `https://sms.tencentcloudapi.com`, region `ap-guangzhou`).
2. Enter SecretId, SdkAppId, SecretKey.
3. Replace the `BirdCoder` signature with the signature approved by Tencent Cloud.
4. In template management, set the SMS templates to `approved` and enable them;
   unapproved templates cannot be sent.
5. The four SMS rules are enabled with the Tencent signature first.

## 6. Acceptance

- Trigger a test email / SMS from the notification test or verification flow.
- Check delivery records and status.
- Email failures: authorization code, sender address activation, SMTP port.
- SMS failures: credentials, approved signature, approved + enabled template.
- `pnpm run db:status` must stay clean and `/healthz` healthy.

## 7. Security and operations

- Keep `SDKWORK_MESSAGING_SECRET_ENCRYPTION_KEY` in the deployment secret
  manager; never commit it or put it in `etc/topology/*.env`.
- All seeds use `ON CONFLICT DO NOTHING`; re-running `db:seed` never overwrites
  operator edits.
- Provider, signature and template changes do not require re-seeding.
- Upgrades run `db:migrate` / `db:bootstrap`; never replay the baseline.
- Backup procedure: see `backup-restore.en.md`.

## 8. Troubleshooting

| Symptom | Cause | Action |
| --- | --- | --- |
| Empty console lists | Seeds not applied, or wrong tenant | Run `pnpm db:seed`; confirm the signed-in tenant |
| Saving a channel secret fails | Encryption key missing or database not writable | Set `SDKWORK_MESSAGING_SECRET_ENCRYPTION_KEY` and retry |
| Email authentication failure | Bad authorization code, client service disabled, sender not activated | Regenerate the code and verify the sender |
| SMS send failure | Bad credentials, unapproved signature/template | Check the Tencent Cloud console state |
| `db:drift:check` fails | Manual schema edits or pending migrations | Run `db:migrate`, then follow the drift report |
