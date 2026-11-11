import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPBASE_ROOT = path.resolve(ROOT, "..", "sdkwork-appbase");

const requiredCurrentFiles = [
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "vitest.config.ts",
  "Cargo.toml",
  "apps/sdkwork-messaging-common/packages/sdkwork-messaging-runtime-bootstrap/package.json",
  "apps/sdkwork-messaging-common/packages/sdkwork-messaging-contracts/package.json",
  "apps/sdkwork-messaging-common/packages/sdkwork-messaging-sdk-ports/package.json",
  "apps/sdkwork-messaging-common/packages/sdkwork-messaging-service/package.json",
  "apps/sdkwork-messaging-common/packages/sdkwork-messaging-runtime/package.json",
  "crates/sdkwork-messaging-delivery-service/Cargo.toml",
  "crates/sdkwork-messaging-delivery-repository-sqlx/Cargo.toml",
  "crates/sdkwork-messaging-delivery-repository-sqlx/migrations/0001_messaging_storage.sql",
  "crates/sdkwork-api-messaging-assembly/Cargo.toml",
  "crates/sdkwork-routes-messaging-backend-api/Cargo.toml",
  "sdks/materialize-messaging-v3-openapi-boundaries.mjs",
  "sdks/sdkwork-messaging-app-sdk/openapi/sdkwork-messaging-app-api.openapi.yaml",
  "sdks/sdkwork-messaging-app-sdk/openapi/sdkwork-messaging-app-api.sdkgen.yaml",
  "sdks/sdkwork-messaging-backend-sdk/openapi/sdkwork-messaging-backend-api.openapi.yaml",
  "sdks/sdkwork-messaging-backend-sdk/openapi/sdkwork-messaging-backend-api.sdkgen.yaml",
];

const forbiddenCurrentPaths = [
  "packages/common/conversation",
  "packages/pc-react/communication",
  "packages/pc-react/messaging/sdkwork-messaging-admin-pc-react",
  "crates/sdkwork-routes-im-open-api",
  "sdks/_route-manifests/open-api/sdkwork-routes-im-open-api.route-manifest.json",
  "sdks/sdkwork-im-sdk",
];

const forbiddenAppbaseDirs = [
  "packages/common/messaging",
  "packages/common/conversation",
  "packages/pc-react/communication",
  "packages/pc-react/messaging",
  "packages/mobile-react/communication",
  "packages/mobile-flutter/communication",
  "packages/native-rust/communication",
  "packages/native-rust/messaging",
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function walkFiles(root) {
  if (!existsSync(root)) {
    return [];
  }

  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (![".git", "node_modules", "target", "dist", "build"].includes(entry.name)) {
          stack.push(fullPath);
        }
      } else {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function operations(openApi) {
  const items = [];
  for (const [routePath, pathItem] of Object.entries(openApi.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      if (pathItem?.[method]) {
        items.push({ method, path: routePath, operation: pathItem[method] });
      }
    }
  }
  return items;
}

function assertHasIdempotencyHeader(openApi, operationId) {
  const item = operations(openApi).find((candidate) => candidate.operation.operationId === operationId);
  assert.ok(item, `missing operation ${operationId}`);
  const header = item.operation.parameters?.find(
    (parameter) => parameter?.in === "header" && parameter?.name === "Idempotency-Key",
  );
  assert.ok(header, `${operationId} must expose Idempotency-Key`);
  assert.equal(header.required, true, `${operationId} Idempotency-Key must be required`);
  assert.equal(header["x-sdkwork-idempotency-key"], true, `${operationId} must use the SDKWork idempotency header`);
}

function assertSdkFamily({ family, authority, owner, prefix, expectedOperationIds }) {
  const openApi = readJson(`sdks/${family}/openapi/${authority}.openapi.yaml`);
  const sdkgen = readJson(`sdks/${family}/openapi/${authority}.sdkgen.yaml`);
  const assembly = readJson(`sdks/${family}/sdk-manifest.json`);
  const component = readJson(`sdks/${family}/specs/component.spec.json`);

  assert.equal(openApi.openapi, "3.1.2");
  assert.equal(openApi.info["x-sdkwork-api-authority"], authority);
  assert.equal(openApi.info["x-sdkwork-sdk-family"], family);
  assert.equal(sdkgen["x-sdkwork-derived-from"], `openapi/${authority}.openapi.yaml`);
  assert.equal(assembly.sdkOwner, owner);
  assert.equal(assembly.apiAuthority, authority);
  assert.equal(component.generator.package, "@sdkwork/sdk-generator");
  assert.equal(component.generator.standardProfile, "sdkwork-v3");

  const actualOperations = operations(openApi);
  const actualIds = actualOperations.map((item) => item.operation.operationId).sort();
  for (const operationId of expectedOperationIds) {
    assert.ok(actualIds.includes(operationId), `${authority} missing operation ${operationId}`);
  }

  for (const { path: routePath, operation } of actualOperations) {
    assert.ok(routePath.startsWith(prefix), `${authority} route must use ${prefix}: ${routePath}`);
    assert.equal(operation["x-sdkwork-owner"], owner);
    assert.equal(operation["x-sdkwork-api-authority"], authority);
    assert.ok(operation["x-sdkwork-domain"]);
    assert.ok(operation["x-sdkwork-resource"]);
    assert.ok(operation["x-sdkwork-permission"] || operation["x-sdkwork-public"]);
    assert.ok(operation["x-sdkwork-source-route-crate"]);
    assert.ok(operation["x-sdkwork-server-request-id"], `${operation.operationId} must use server-owned requestId`);
  }
}

for (const file of requiredCurrentFiles) {
  assert.ok(existsSync(path.join(ROOT, file)), `missing required migrated file: ${file}`);
}

for (const forbiddenPath of forbiddenCurrentPaths) {
  assert.ok(!existsSync(path.join(ROOT, forbiddenPath)), `messaging must not own IM SDK artifact: ${forbiddenPath}`);
}

const rootPackage = readJson("package.json");
assert.equal(rootPackage.name, "@sdkwork/messaging-workspace");
assert.equal(rootPackage.sdkwork?.owner, "sdkwork-messaging");
assert.deepEqual(
  rootPackage.sdkwork?.apiAuthorities,
  ["sdkwork-messaging-app-api", "sdkwork-messaging-backend-api"],
  "messaging workspace must only advertise messaging API authorities",
);
assert.ok(!rootPackage.scripts?.["sdk:generate:im"], "messaging workspace must not generate sdkwork-im-sdk");

for (const packageJsonFile of walkFiles(path.join(ROOT, "packages")).filter((file) => path.basename(file) === "package.json")) {
  const packageJson = JSON.parse(readFileSync(packageJsonFile, "utf8"));
  assert.notEqual(packageJson.sdkwork?.workspace, "sdkwork-appbase", `${packageJsonFile} still belongs to appbase`);
  if (packageJson.sdkwork?.domain) {
    assert.ok(
      ["foundation", "messaging"].includes(packageJson.sdkwork.domain),
      `${packageJsonFile} has unexpected domain ${packageJson.sdkwork.domain}`,
    );
  }
}

assertSdkFamily({
  family: "sdkwork-messaging-app-sdk",
  authority: "sdkwork-messaging-app-api",
  owner: "sdkwork-messaging",
  prefix: "/app/v3/api",
  expectedOperationIds: [
    "notifications.list",
    "notifications.read",
    "announcements.list",
    "announcements.acknowledge",
    "pushDevices.create",
    "pushDevices.delete",
    "verificationCodes.create",
    "verificationCodes.verify",
  ],
});

const appOpenApi = readJson("sdks/sdkwork-messaging-app-sdk/openapi/sdkwork-messaging-app-api.openapi.yaml");
for (const operationId of [
  "notifications.read",
  "announcements.acknowledge",
  "pushDevices.create",
  "pushDevices.delete",
  "verificationCodes.create",
  "verificationCodes.verify",
]) {
  assertHasIdempotencyHeader(appOpenApi, operationId);
}
assert.equal(appOpenApi.components.schemas.MessagingPushDeviceRegisterRequest.properties.token.writeOnly, true);
assert.equal(appOpenApi.components.schemas.MessagingVerificationCodeCreateRequest.properties.target.writeOnly, true);
assert.equal(appOpenApi.components.schemas.MessagingVerificationCodeVerifyRequest.properties.code.writeOnly, true);
assert.deepEqual(
  appOpenApi.components.schemas.MessagingPushDeviceRegisterRequest.properties.platform.enum,
  ["ios", "android", "web"],
);

assertSdkFamily({
  family: "sdkwork-messaging-backend-sdk",
  authority: "sdkwork-messaging-backend-api",
  owner: "sdkwork-messaging",
  prefix: "/backend/v3/api",
  expectedOperationIds: [
    "notifications.list",
    "notifications.create",
    "announcements.list",
    "announcements.create",
    "pushMessages.list",
    "pushMessages.create",
    "outboundMessages.list",
    "outboundMessages.create",
    "verificationPolicies.list",
    "verificationPolicies.update",
    "emailAccounts.list",
    "emailAccounts.create",
    "emailAccounts.retrieve",
    "emailAccounts.update",
    "emailAccounts.delete",
    "emailSenders.list",
    "emailSenders.create",
    "emailSenders.retrieve",
    "emailSenders.update",
    "emailSenders.delete",
    "emailSendRules.list",
    "emailSendRules.update",
    "smsAccounts.list",
    "smsAccounts.create",
    "smsAccounts.retrieve",
    "smsAccounts.update",
    "smsAccounts.delete",
    "smsSignatures.list",
    "smsSignatures.create",
    "smsSignatures.retrieve",
    "smsSignatures.update",
    "smsSignatures.delete",
    "smsSendRules.list",
    "smsSendRules.update",
    "templates.list",
    "templates.create",
    "templates.retrieve",
    "templates.update",
    "templates.delete",
  ],
});

const backendOpenApi = readJson("sdks/sdkwork-messaging-backend-sdk/openapi/sdkwork-messaging-backend-api.openapi.yaml");
for (const operationId of [
  "notifications.create",
  "announcements.create",
  "pushMessages.create",
  "outboundMessages.create",
  "verificationPolicies.update",
]) {
  assertHasIdempotencyHeader(backendOpenApi, operationId);
}
assert.equal(backendOpenApi.components.schemas.MessagingOutboundMessageSendRequest.properties.target.writeOnly, true);
assert.deepEqual(
  backendOpenApi.components.schemas.MessagingOutboundMessageSendRequest.properties.channel.enum,
  ["sms", "email"],
);
assert.deepEqual(
  backendOpenApi.components.schemas.MessagingVerificationPolicy.properties.channel.enum,
  ["sms", "email"],
);
assert.ok(
  !JSON.stringify({ appOpenApi, backendOpenApi }).includes("/im/v3/api"),
  "messaging SDK APIs must not expose IM routes",
);

const migrationSql = readFileSync(
  path.join(ROOT, "crates/sdkwork-messaging-delivery-repository-sqlx/migrations/0001_messaging_storage.sql"),
  "utf8",
);
for (const expectedConstraint of [
  "ck_messaging_push_device_platform CHECK (platform IN ('ios', 'android', 'web'))",
  "ck_messaging_outbound_message_channel CHECK (channel IN ('sms', 'email'))",
  "ck_messaging_verification_policy_channel CHECK (channel IN ('sms', 'email'))",
  "ck_messaging_verification_challenge_channel CHECK (channel IN ('sms', 'email'))",
  "uk_messaging_notification_idempotency UNIQUE (tenant_id, organization_id, idempotency_key)",
  "uk_messaging_announcement_idempotency UNIQUE (tenant_id, organization_id, idempotency_key)",
  "uk_messaging_push_message_idempotency UNIQUE (tenant_id, organization_id, idempotency_key)",
  "uk_messaging_outbound_message_idempotency UNIQUE (tenant_id, organization_id, idempotency_key)",
  "uk_messaging_verification_challenge_idempotency UNIQUE (tenant_id, organization_id, idempotency_key)",
  "uk_messaging_verification_attempt_idempotency UNIQUE (tenant_id, organization_id, challenge_id, idempotency_key)",
  "fk_messaging_notification_recipient_notification FOREIGN KEY (notification_id) REFERENCES messaging_notification(id)",
  "fk_messaging_announcement_audience_announcement FOREIGN KEY (announcement_id) REFERENCES messaging_announcement(id)",
  "fk_messaging_announcement_receipt_announcement FOREIGN KEY (announcement_id) REFERENCES messaging_announcement(id)",
  "fk_messaging_push_delivery_message FOREIGN KEY (push_message_id) REFERENCES messaging_push_message(id)",
  "fk_messaging_push_delivery_device FOREIGN KEY (push_device_id) REFERENCES messaging_push_device(id)",
  "fk_messaging_outbound_delivery_message FOREIGN KEY (outbound_message_id) REFERENCES messaging_outbound_message(id)",
  "fk_messaging_verification_challenge_policy FOREIGN KEY (tenant_id, organization_id, scene_code, channel) REFERENCES messaging_verification_policy(tenant_id, organization_id, scene_code, channel)",
  "fk_messaging_verification_challenge_outbound_message FOREIGN KEY (outbound_message_id) REFERENCES messaging_outbound_message(id)",
  "fk_messaging_verification_attempt_challenge FOREIGN KEY (challenge_id) REFERENCES messaging_verification_challenge(id)",
]) {
  assert.ok(migrationSql.includes(expectedConstraint), `migration missing ${expectedConstraint}`);
}

if (existsSync(APPBASE_ROOT)) {
  for (const relativeDir of forbiddenAppbaseDirs) {
    const fullPath = path.join(APPBASE_ROOT, relativeDir);
    assert.ok(
      !existsSync(fullPath) || !statSync(fullPath).isDirectory(),
      `sdkwork-appbase still owns migrated messaging directory: ${fullPath}`,
    );
  }

  const workspace = readFileSync(path.join(APPBASE_ROOT, "pnpm-workspace.yaml"), "utf8");
  assert.doesNotMatch(workspace, /sdkwork-space[\\/]sdkwork-messaging/u);
  const tsconfig = readFileSync(path.join(APPBASE_ROOT, "tsconfig.base.json"), "utf8");
  assert.doesNotMatch(tsconfig, /sdkwork-space[\\/]sdkwork-messaging/u);
  assert.doesNotMatch(tsconfig, /"@sdkwork\/(?:conversation|im-pc-react|messaging-[\w-]+|channel-pc-react|contacts-pc-react|social-pc-react)"/u);

  const lockfile = readFileSync(path.join(APPBASE_ROOT, "pnpm-lock.yaml"), "utf8");
  assert.doesNotMatch(lockfile, /packages\/(?:pc-react|mobile-react|mobile-flutter)\/communication/u);
  assert.doesNotMatch(lockfile, /@sdkwork\/(?:channel|contacts|social|im|rtc|comments|community)-(?:pc|mobile)-react/u);
}


// ---------------------------------------------------------------------------
// Configuration schema contract (multi-provider email/SMS hardening).
// DATABASE_SPEC §6.5 (actor audit), §6.6/DB017 (soft-delete-aware uniqueness),
// §17 (optimistic version), §22 (messaging_channel retirement).

const baselineDdl = readFileSync(
  path.join(ROOT, "database/ddl/baseline/postgres/0001_messaging_baseline.sql"),
  "utf8",
);

function tableBody(ddl, table) {
  const marker = "CREATE TABLE IF NOT EXISTS ".concat(table, " (");
  const start = ddl.indexOf(marker);
  assert.ok(start >= 0, "baseline must declare ".concat(table));
  const end = ddl.indexOf(");", start);
  return ddl.slice(start, end);
}

const configTables = [
  "messaging_email_account",
  "messaging_email_sender",
  "messaging_email_send_rule",
  "messaging_sms_account",
  "messaging_sms_signature",
  "messaging_sms_send_rule",
];

for (const table of configTables) {
  const body = tableBody(baselineDdl, table);
  assert.ok(body.includes("updated_by BIGINT"), table.concat(" must carry updated_by actor audit"));
  assert.ok(body.includes("version BIGINT NOT NULL DEFAULT 0"), table.concat(" must carry an optimistic version"));
  assert.ok(body.includes("deleted_at TIMESTAMPTZ"), table.concat(" must be soft-delete capable"));
}

// Secret material lives on the provider-account tables only.
for (const accountTable of ["messaging_email_account", "messaging_sms_account"]) {
  const body = tableBody(baselineDdl, accountTable);
  assert.ok(body.includes("secret_ciphertext VARCHAR"), accountTable.concat(" must keep encrypted secret storage"));
  assert.ok(body.includes("secret_fingerprint VARCHAR"), accountTable.concat(" must keep the secret fingerprint column"));
}

// Soft-delete-aware uniqueness: partial unique indexes over live rows only.
for (const indexName of [
  "uk_messaging_email_account_scope_name",
  "uk_messaging_email_sender_address",
  "uk_messaging_email_send_rule_scope_scenario",
  "uk_messaging_sms_account_scope_name",
  "uk_messaging_sms_signature_scope_name",
  "uk_messaging_sms_send_rule_scope_scenario",
]) {
  const marker = "CREATE UNIQUE INDEX IF NOT EXISTS ".concat(indexName);
  const indexStart = baselineDdl.indexOf(marker);
  assert.ok(indexStart >= 0, "baseline must declare partial unique index ".concat(indexName));
  const indexEnd = baselineDdl.indexOf(";", indexStart);
  const indexDdl = baselineDdl.slice(indexStart, indexEnd);
  assert.ok(indexDdl.includes("WHERE deleted_at IS NULL"), indexName.concat(" must be partial over live rows"));
  assert.ok(!baselineDdl.includes("CONSTRAINT ".concat(indexName, " UNIQUE")), indexName.concat(" must not remain a table constraint"));
}

// Retired legacy channel surface: the multi-provider tables replaced it.
assert.ok(!baselineDdl.includes("CREATE TABLE IF NOT EXISTS messaging_channel"), "messaging_channel must be retired from the baseline");
assert.ok(!baselineDdl.includes("uk_messaging_channel_scope"), "messaging_channel scope constraint must be retired");

const retireMigration = readFileSync(
  path.join(ROOT, "database/migrations/postgres/0004_config_hardening.up.sql"),
  "utf8",
);
assert.ok(retireMigration.includes("DROP TABLE IF EXISTS messaging_channel"), "0004 must drop messaging_channel");
assert.ok(retireMigration.includes("WHERE deleted_at IS NULL"), "0004 must convert uniqueness to partial indexes");

// ---------------------------------------------------------------------------
// Email provider expansion (consumer mailbox services) contract.
// DATABASE_SPEC §6.4 reserved ids, §8.2 language-neutral common seeds, §22
// provider catalog.

const consumerMailboxProviders = ["tencent_mail", "mail_139", "gmail", "microsoft"];
const baselineEmailProviders = ["enterprise_mail", ...consumerMailboxProviders];

for (const provider of baselineEmailProviders) {
  assert.ok(
    baselineDdl.includes(`'${provider}'`),
    `baseline email provider constraint must accept ${provider}`,
  );
}
assert.ok(
  baselineDdl.includes("receive_enabled BOOLEAN NOT NULL DEFAULT FALSE"),
  "baseline must keep the inbound switch next to the outbound enabled flag",
);

const providerExpansionMigrationPath = path.join(
  ROOT,
  "database/migrations/postgres/0006_email_provider_expansion.up.sql",
);
assert.ok(existsSync(providerExpansionMigrationPath), "0006 email provider expansion migration must exist");
const providerExpansionMigration = readFileSync(providerExpansionMigrationPath, "utf8");
assert.ok(
  providerExpansionMigration.includes("ADD COLUMN IF NOT EXISTS receive_enabled BOOLEAN NOT NULL DEFAULT FALSE"),
  "0006 must add the inbound switch idempotently",
);
assert.ok(
  providerExpansionMigration.includes("DROP CONSTRAINT IF EXISTS ck_messaging_email_account_provider"),
  "0006 must replace the provider constraint instead of narrowing it",
);
for (const provider of consumerMailboxProviders) {
  assert.ok(
    providerExpansionMigration.includes(`'${provider}'`),
    `0006 provider constraint must accept ${provider}`,
  );
}
for (const legacyProvider of ["smtp", "aliyun", "tencent", "sendgrid", "mailgun", "amazon_ses", "postmark", "resend"]) {
  assert.ok(
    providerExpansionMigration.includes(`'${legacyProvider}'`),
    `0006 must keep the existing ${legacyProvider} provider valid`,
  );
}

const enterpriseProviderMigration = readFileSync(
  path.join(ROOT, "database/migrations/postgres/0008_enterprise_mail_provider.up.sql"),
  "utf8",
);
assert.ok(
  enterpriseProviderMigration.includes("DROP CONSTRAINT IF EXISTS ck_messaging_email_account_provider"),
  "0008 must replace the provider constraint instead of narrowing it",
);
for (const provider of ["enterprise_mail", "tencent_mail", "gmail", "microsoft", "smtp", "tencent", "sendgrid"]) {
  assert.ok(
    enterpriseProviderMigration.includes(`'${provider}'`),
    `0008 provider constraint must accept ${provider}`,
  );
}

const seedManifest = readJson("database/seeds/seed.manifest.json");
assert.ok(
  seedManifest.profiles?.standard?.common?.includes("002_email_provider_defaults.sql"),
  "standard seed profile must apply the email channel initialization data",
);
const emailSeed = readFileSync(
  path.join(ROOT, "database/seeds/common/002_email_provider_defaults.sql"),
  "utf8",
);
assert.equal(
  (emailSeed.match(/\nON CONFLICT DO NOTHING;/gu) ?? []).length,
  3,
  "email channel seed must stay idempotent across accounts, senders, and rules",
);
assert.ok(
  emailSeed.includes("100001, 0"),
  "email channel seed must target the canonical installation tenant/organization",
);
for (const provider of baselineEmailProviders) {
  assert.ok(emailSeed.includes(`'${provider}'`), `email channel seed must pre-create ${provider}`);
}

// ---------------------------------------------------------------------------
// SMS channel initialization contract (accounts + signatures + scenario rules).
// DATABASE_SPEC §6.4 reserved ids, §8.2 language-neutral common seeds, §22
// provider catalog.

const smsProviders = [
  "aliyun",
  "tencent",
  "huawei",
  "yuntongxun",
  "submail",
  "chuanglan",
  "twilio",
  "generic_http",
];
for (const provider of smsProviders) {
  assert.ok(
    baselineDdl.includes(`'${provider}'`),
    `baseline sms provider constraint must accept ${provider}`,
  );
}
assert.ok(
  seedManifest.profiles?.standard?.common?.includes("003_sms_provider_defaults.sql"),
  "standard seed profile must apply the SMS channel initialization data",
);
const smsSeed = readFileSync(
  path.join(ROOT, "database/seeds/common/003_sms_provider_defaults.sql"),
  "utf8",
);
assert.equal(
  (smsSeed.match(/\nON CONFLICT DO NOTHING;/gu) ?? []).length,
  3,
  "SMS channel seed must stay idempotent across accounts, signatures, and rules",
);
assert.ok(
  smsSeed.includes("100001, 0"),
  "SMS channel seed must target the canonical installation tenant/organization",
);
for (const provider of smsProviders) {
  assert.ok(smsSeed.includes(`'${provider}'`), `SMS channel seed must pre-create ${provider}`);
}
assert.ok(
  smsSeed.includes("INSERT INTO messaging_sms_signature"),
  "SMS channel seed must initialize signature identities",
);
assert.ok(
  smsSeed.includes("INSERT INTO messaging_sms_send_rule"),
  "SMS channel seed must initialize scenario send rules",
);

// ---------------------------------------------------------------------------
// Localized default message templates (DATABASE_FRAMEWORK_SPEC §8.2: default
// templates are locale-specific initialization data).

for (const locale of ["zh-CN", "en-US"]) {
  const localeFile = `001_message_templates.sql`;
  assert.deepEqual(
    seedManifest.profiles?.standard?.locales?.[locale],
    [localeFile],
    `${locale} standard profile must apply the default template seed`,
  );
  const localeSet = seedManifest.localeSets?.[locale];
  assert.ok(localeSet, `${locale} locale set must be declared`);
  assert.deepEqual(localeSet.files, [`locales/${locale}/${localeFile}`]);
  const expectedChecksum = `sha256:${createHash("sha256")
    .update(JSON.stringify(localeSet.files))
    .digest("hex")}`;
  assert.equal(
    localeSet.checksum,
    expectedChecksum,
    `${locale} locale set checksum must match its file list`,
  );

  const localeSeedPath = path.join(
    ROOT,
    `database/seeds/locales/${locale}/${localeFile}`,
  );
  assert.ok(existsSync(localeSeedPath), `${locale} template seed must exist`);
  const localeSeed = readFileSync(localeSeedPath, "utf8");
  assert.ok(
    localeSeed.includes("INSERT INTO messaging_template"),
    `${locale} template seed must insert templates`,
  );
  assert.ok(
    localeSeed.includes("100001, 0"),
    `${locale} template seed must target the canonical installation scope`,
  );
  assert.equal(
    (localeSeed.match(/\nON CONFLICT DO NOTHING;/gu) ?? []).length,
    1,
    `${locale} template seed must stay idempotent`,
  );
  for (const code of ["verification_code", "order_paid", "quota_warning", "marketing_campaign"]) {
    assert.ok(localeSeed.includes(`'${code}'`), `${locale} template seed must include ${code}`);
  }
  assert.ok(localeSeed.includes("'email',"), `${locale} template seed must include email templates`);
  assert.ok(localeSeed.includes("'sms',"), `${locale} template seed must include SMS templates`);
}

// ---------------------------------------------------------------------------
// Fresh-install migration replay: the consolidated baseline no longer declares
// the retired `messaging_channel` table, but 0002/0003 still backfill from it.
// 0000 recreates the compatibility table before those migrations and 0007
// retires it again for databases that had already applied 0004.

const migrationFiles = readdirSync(path.join(ROOT, "database/migrations/postgres"))
  .filter((entry) => entry.endsWith(".up.sql"))
  .sort();
assert.equal(
  migrationFiles[0],
  "0000_legacy_channel_compat.up.sql",
  "the legacy compatibility migration must run before every other migration",
);
const dropIndex = migrationFiles.indexOf("0004_config_hardening.up.sql");
const compatIndex = migrationFiles.indexOf("0000_legacy_channel_compat.up.sql");
const compatRetireIndex = migrationFiles.indexOf("0007_drop_legacy_channel_compat.up.sql");
assert.ok(dropIndex > compatIndex, "0004 must run after the compatibility table exists");
assert.ok(
  compatRetireIndex > dropIndex,
  "0007 must run after the compatibility table and the 0004 retirement",
);
const compatMigration = readFileSync(
  path.join(ROOT, "database/migrations/postgres/0000_legacy_channel_compat.up.sql"),
  "utf8",
);
assert.ok(
  compatMigration.includes("CREATE TABLE IF NOT EXISTS messaging_channel"),
  "0000 must recreate the legacy channel table for the 0002/0003 backfills",
);
assert.ok(
  compatMigration.includes("channel VARCHAR(32) NOT NULL"),
  "0000 must expose the columns the legacy backfills read",
);
const compatRetireMigration = readFileSync(
  path.join(ROOT, "database/migrations/postgres/0007_drop_legacy_channel_compat.up.sql"),
  "utf8",
);
assert.ok(
  compatRetireMigration.includes("DROP TABLE IF EXISTS messaging_channel"),
  "0007 must retire the compatibility table on upgraded databases",
);

console.log("sdkwork-messaging migration contract checks passed.");

