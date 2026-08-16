import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPBASE_ROOT = path.resolve(ROOT, "..", "sdkwork-appbase");

const families = [
  {
    family: "sdkwork-messaging-app-sdk",
    authority: "sdkwork-messaging-app-api",
    prefix: "/app/v3/api",
    surface: "app-api",
    routeManifest: "sdkwork-routes-messaging-app-api.route-manifest.json",
  },
  {
    family: "sdkwork-messaging-backend-sdk",
    authority: "sdkwork-messaging-backend-api",
    prefix: "/backend/v3/api",
    surface: "backend-api",
    routeManifest: "sdkwork-routes-messaging-backend-api.route-manifest.json",
  },
];

const forbiddenLegacyArtifacts = [
  "packages/common/conversation",
  "packages/pc-react/communication",
  "packages/pc-react/messaging/sdkwork-messaging-admin-pc-react",
  "crates/sdkwork-routes-im-open-api",
  "sdks/_route-manifests/open-api/sdkwork-routes-im-open-api.route-manifest.json",
  "sdks/sdkwork-im-sdk",
];

const forbiddenLegacyTextPatterns = [
  /@sdkwork\/conversation/u,
  /@sdkwork\/im-pc-react/u,
  /@sdkwork\/im-sdk/u,
  /@sdkwork\/messaging-admin-pc-react/u,
  /sdkwork-conversation/u,
  /sdkwork-im-pc-react/u,
  /sdkwork-im-sdk/u,
  /sdkwork-im-open-api/u,
  /sdkwork-routes-im-open-api/u,
  /\/im\/v3\/api/u,
  /\bmessaging_provider_[a-z0-9_]+/iu,
  /\bmessaging_route_rule[a-z0-9_]*\b/iu,
  /\biam_verification_[a-z0-9_]+/iu,
  /\bproviderAccounts\b/u,
  /\bsenderIdentities\b/u,
  /\brouteRules\b/u,
  /\bsuppressions\b/u,
  /\brateLimitBuckets\b/u,
  /\bchatSessions\b/u,
  /\bchatSession\b/u,
];

const requiredMessagingTerms = [
  "notifications",
  "announcements",
  "pushDevices",
  "pushMessages",
  "sms",
  "email",
  "verificationCodes",
  "outboundMessages",
];

const forbiddenNonMessagingFoundationPatterns = [
  /\bSdkworkMedia[A-Za-z0-9_]*\b/u,
  /\bgetSdkworkMediaDeliveryUrl\b/u,
  /\bobject_storage\b/u,
  /\bbucketId\b/u,
  /\bobjectBlobId\b/u,
  /\bthumbnail[A-Za-z0-9_]*\b/iu,
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
  const result = [];
  for (const [routePath, pathItem] of Object.entries(openApi.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      if (pathItem?.[method]) {
        result.push({ method, path: routePath, operation: pathItem[method] });
      }
    }
  }
  return result;
}

function requestSchemaName(operation) {
  const ref = operation.requestBody?.content?.["application/json"]?.schema?.$ref;
  return typeof ref === "string" ? ref.replace("#/components/schemas/", "") : undefined;
}

function assertHasIdempotencyHeader(openApi, operationId) {
  const match = operations(openApi).find((item) => item.operation.operationId === operationId);
  assert.ok(match, `missing operation ${operationId}`);
  const parameter = match.operation.parameters?.find(
    (candidate) => candidate?.in === "header" && candidate?.name === "Idempotency-Key",
  );
  assert.ok(parameter, `${operationId} must declare Idempotency-Key header`);
  assert.equal(parameter.required, true, `${operationId} Idempotency-Key must be required`);
  assert.equal(parameter.schema?.type, "string", `${operationId} Idempotency-Key must be a string`);
  assert.equal(parameter["x-sdkwork-idempotency-key"], true, `${operationId} must mark standard idempotency header`);
  assert.equal(match.operation["x-sdkwork-idempotent"], true, `${operationId} must be marked idempotent`);
}

function assertSensitiveField(schema, fieldName) {
  assert.equal(schema.properties?.[fieldName]?.writeOnly, true, `${fieldName} must be writeOnly`);
  assert.equal(schema.properties?.[fieldName]?.["x-sensitive"], true, `${fieldName} must be marked sensitive`);
}

function generatedServerOpenApiRoot(family) {
  return path.join(
    ROOT,
    "sdks",
    family.family,
    `${family.family}-typescript`,
    "generated",
    "server-openapi",
  );
}

function assertNoLegacyTextResidues(scopeRoot, label) {
  const residues = walkFiles(scopeRoot)
    .filter((file) => /\.(?:json|yaml|yml|ts|tsx|js|mjs|rs|toml|md|ps1)$/u.test(file))
    .filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`))
    .filter((file) => !file.includes(`${path.sep}target${path.sep}`))
    .filter((file) => !file.includes(`${path.sep}dist${path.sep}`))
    .filter((file) => !file.endsWith(path.join("scripts", "messaging-governance.test.mjs")))
    .filter((file) => !file.endsWith(path.join("tests", "messaging-migration-contract.test.mjs")))
    .flatMap((file) => {
      const content = readFileSync(file, "utf8");
      return forbiddenLegacyTextPatterns.flatMap((pattern) => {
        const match = content.match(pattern);
        return match ? [`${path.relative(ROOT, file)}: ${match[0]}`] : [];
      });
    });
  assert.deepEqual(residues, [], `${label} still contains legacy messaging residues`);
}

for (const family of families) {
  const openApi = readJson(`sdks/${family.family}/openapi/${family.authority}.openapi.yaml`);
  const sdkgen = readJson(`sdks/${family.family}/openapi/${family.authority}.sdkgen.yaml`);
  const assembly = readJson(`sdks/${family.family}/sdk-manifest.json`);
  const component = readJson(`sdks/${family.family}/specs/component.spec.json`);
  const routeManifest = readJson(`sdks/_route-manifests/${family.surface}/${family.routeManifest}`);
  const generateScript = readFileSync(path.join(ROOT, "sdks", family.family, "bin", "generate-sdk.ps1"), "utf8");

  assert.equal(openApi.openapi, "3.1.2");
  assert.equal(sdkgen["x-sdkwork-derived-from"], `openapi/${family.authority}.openapi.yaml`);
  assert.equal(openApi.info["x-sdkwork-api-authority"], family.authority);
  assert.equal(openApi.info["x-sdkwork-sdk-family"], family.family);
  assert.equal(assembly.sdkOwner, "sdkwork-messaging");
  assert.equal(assembly.apiAuthority, family.authority);
  assert.equal(component.generator.package, "@sdkwork/sdk-generator");
  assert.equal(component.generator.standardProfile, "sdkwork-v3");
  assert.match(generateScript, /sdkwork-sdk-generator\\bin\\sdkgen\.js/u);
  assert.doesNotMatch(generateScript, /-t openapi\b/u);
  assert.equal(routeManifest.kind, "sdkwork.route.manifest");
  assert.equal(routeManifest.owner, "sdkwork-messaging");
  assert.equal(routeManifest.apiAuthority, family.authority);
  assert.equal(routeManifest.sdkFamily, family.family);

  const generatedRoot = generatedServerOpenApiRoot(family);
  for (const artifact of ["node_modules", "dist", "package-lock.json"]) {
    assert.ok(
      !existsSync(path.join(generatedRoot, artifact)),
      `${family.family} generated output contains runtime artifact ${artifact}`,
    );
  }

  for (const { path: routePath, operation } of operations(openApi)) {
    assert.ok(routePath.startsWith(family.prefix), `${family.authority} bad prefix: ${routePath}`);
    assert.equal(operation["x-sdkwork-owner"], "sdkwork-messaging");
    assert.equal(operation["x-sdkwork-api-authority"], family.authority);
    assert.ok(operation["x-sdkwork-resource"], `${operation.operationId} missing resource`);
    assert.ok(operation["x-sdkwork-source-route-crate"], `${operation.operationId} missing route crate`);
    assert.ok(operation["x-sdkwork-server-request-id"], `${operation.operationId} must be server request-id owned`);
    assert.ok(operation["x-sdkwork-tenant-scope"], `${operation.operationId} missing tenant scope`);
    assert.ok(operation["x-sdkwork-data-scope"], `${operation.operationId} missing data scope`);
    assert.ok(operation["x-sdkwork-audit-event"], `${operation.operationId} missing audit event`);

    const schemaName = requestSchemaName(operation);
    if (schemaName) {
      const schema = openApi.components.schemas[schemaName];
      assert.ok(schema, `${operation.operationId} references missing schema ${schemaName}`);
      assert.ok(
        !schema.required?.includes("requestId"),
        `${operation.operationId} request schema must not require client-owned requestId`,
      );
      assert.ok(
        !Object.hasOwn(schema.properties ?? {}, "requestId"),
        `${operation.operationId} request schema must not expose client-owned requestId`,
      );
    }
  }

  const sdkImTypeResidues = walkFiles(path.join(ROOT, "sdks", family.family))
    .filter((file) => /\.(?:json|yaml|yml|ts|md)$/u.test(file))
    .filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`))
    .filter((file) => !file.includes(`${path.sep}dist${path.sep}`))
    .flatMap((file) => {
      const relativePath = path.relative(ROOT, file);
      const content = readFileSync(file, "utf8");
      return [
        /\bIm[A-Z][A-Za-z0-9_]*/u,
        /im-(?:conversation|message|delivery)/u,
        /\bim\.(?:conversations|messages|deliveryReceipts)/u,
      ].flatMap((pattern) => {
        const match = content.match(pattern);
        return match ? [`${relativePath}: ${match[0]}`] : [];
      });
    });
  assert.deepEqual(sdkImTypeResidues, [], `${family.family} must not retain IM SDK generated types`);
}

const appOpenApi = readJson("sdks/sdkwork-messaging-app-sdk/openapi/sdkwork-messaging-app-api.openapi.yaml");
const backendOpenApi = readJson("sdks/sdkwork-messaging-backend-sdk/openapi/sdkwork-messaging-backend-api.openapi.yaml");
const allOperationIds = [...operations(appOpenApi), ...operations(backendOpenApi)].map((item) => item.operation.operationId);
for (const requiredTerm of requiredMessagingTerms) {
  assert.ok(
    JSON.stringify({ appOpenApi, backendOpenApi }).includes(requiredTerm),
    `messaging OpenAPI must expose ${requiredTerm}`,
  );
}

assert.ok(allOperationIds.includes("messaging.verificationCodes.create"));
assert.ok(allOperationIds.includes("messaging.verificationCodes.verify"));
assert.ok(allOperationIds.includes("messaging.outboundMessages.create"));

for (const operationId of [
  "messaging.notifications.read",
  "messaging.announcements.acknowledge",
  "messaging.pushDevices.create",
  "messaging.pushDevices.delete",
  "messaging.verificationCodes.create",
  "messaging.verificationCodes.verify",
]) {
  assertHasIdempotencyHeader(appOpenApi, operationId);
}

for (const operationId of [
  "messaging.notifications.create",
  "messaging.announcements.create",
  "messaging.pushMessages.create",
  "messaging.outboundMessages.create",
  "messaging.verificationPolicies.update",
]) {
  assertHasIdempotencyHeader(backendOpenApi, operationId);
}

assertSensitiveField(appOpenApi.components.schemas.MessagingPushDeviceRegisterRequest, "token");
assertSensitiveField(appOpenApi.components.schemas.MessagingVerificationCodeCreateRequest, "target");
assertSensitiveField(appOpenApi.components.schemas.MessagingVerificationCodeVerifyRequest, "code");
assertSensitiveField(backendOpenApi.components.schemas.MessagingOutboundMessageSendRequest, "target");
assert.deepEqual(
  appOpenApi.components.schemas.MessagingPushDeviceRegisterRequest.properties?.platform?.enum,
  ["ios", "android", "web"],
  "app push device registration must stay within app/mobile/web push platforms",
);
assert.deepEqual(
  appOpenApi.components.schemas.MessagingPushDeviceRegisterRequest.properties?.provider?.enum,
  ["apns", "fcm", "web_push", "vendor"],
  "app push providers must stay scoped to push notification providers",
);
assert.equal(
  backendOpenApi.components.schemas.MessagingOutboundMessage.properties?.targetMasked?.readOnly,
  true,
  "masked outbound target is server-derived and read-only",
);

for (const forbiddenPath of forbiddenLegacyArtifacts) {
  assert.ok(!existsSync(path.join(ROOT, forbiddenPath)), `messaging must not own legacy artifact ${forbiddenPath}`);
}

assertNoLegacyTextResidues(ROOT, "messaging workspace");

const packagesRoot = path.join(ROOT, "apps", "sdkwork-messaging-common", "packages");
const packageJsonFiles = walkFiles(packagesRoot).filter((file) => path.basename(file) === "package.json");
const packageNames = packageJsonFiles.map((file) => JSON.parse(readFileSync(file, "utf8")).name).sort();
for (const expected of [
  "@sdkwork/messaging-contracts",
  "@sdkwork/messaging-runtime",
  "@sdkwork/messaging-runtime-bootstrap",
  "@sdkwork/messaging-sdk-ports",
  "@sdkwork/messaging-service",
]) {
  assert.ok(packageNames.includes(expected), `missing package ${expected}`);
}

const staleAppbaseDescriptions = walkFiles(packagesRoot)
  .filter((file) => /\.(?:md|json|ts|tsx|js|mjs|rs|toml)$/u.test(file))
  .flatMap((file) => {
    const content = readFileSync(file, "utf8");
    return [
      /Common conversation foundation for SDKWork appbase/u,
      /Lower-level appbase packages only/u,
      /Reusable appbase packages depend/u,
    ].flatMap((pattern) => {
      const match = content.match(pattern);
      return match ? [`${path.relative(ROOT, file)}: ${match[0]}`] : [];
    });
  });
assert.deepEqual(staleAppbaseDescriptions, []);

const foundationNonMessagingResidues = walkFiles(path.join(ROOT, "packages", "common", "foundation"))
  .filter((file) => /\.(?:md|json|ts|tsx|js|mjs)$/u.test(file))
  .filter((file) => !file.endsWith(path.join("tests", "runtime-bootstrap.standard.test.ts")))
  .flatMap((file) => {
    const content = readFileSync(file, "utf8");
    return forbiddenNonMessagingFoundationPatterns.flatMap((pattern) => {
      const match = content.match(pattern);
      return match ? [`${path.relative(ROOT, file)}: ${match[0]}`] : [];
    });
  });
assert.deepEqual(
  foundationNonMessagingResidues,
  [],
  "messaging foundation bootstrap must not expose media/file/object-storage capabilities",
);

if (existsSync(APPBASE_ROOT)) {
  for (const relativeDir of [
    "packages/common/messaging",
    "packages/common/conversation",
    "packages/pc-react/messaging",
    "packages/pc-react/communication",
    "packages/mobile-react/communication",
    "packages/mobile-flutter/communication",
    "packages/native-rust/communication",
    "packages/native-rust/messaging",
  ]) {
    const fullPath = path.join(APPBASE_ROOT, relativeDir);
    assert.ok(!existsSync(fullPath) || !statSync(fullPath).isDirectory(), `appbase still owns ${relativeDir}`);
  }
}

console.log("sdkwork-messaging governance checks passed.");
