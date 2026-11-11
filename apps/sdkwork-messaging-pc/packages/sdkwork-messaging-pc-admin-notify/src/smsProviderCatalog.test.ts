import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  SMS_PROVIDER_CATALOG,
  SMS_PROVIDER_IDS,
  smsProviderCatalogEntry,
  smsProviderConfigDefaults,
} from "./smsProviderCatalog.ts";

const SEED_PATH = fileURLToPath(
  new URL(
    "../../../../../database/seeds/common/003_sms_provider_defaults.sql",
    import.meta.url,
  ),
);
const SEED_SQL = readFileSync(SEED_PATH, "utf8");

const SEED_TENANT_ID = 100001;
const SEED_ORGANIZATION_ID = 0;

/** Wire enum of `messaging_sms_account.provider` (OpenAPI authority). */
const WIRE_PROVIDERS = [
  "aliyun",
  "tencent",
  "huawei",
  "yuntongxun",
  "submail",
  "chuanglan",
  "twilio",
  "generic_http",
] as const;

/** Documented non-secret endpoint each provider must initialize with. */
const EXPECTED_ENDPOINTS: Record<(typeof WIRE_PROVIDERS)[number], string | null> = {
  aliyun: "https://dysmsapi.aliyuncs.com",
  tencent: "https://sms.tencentcloudapi.com",
  huawei: "https://smsapi.cn-north-4.myhuaweicloud.com",
  yuntongxun: "https://app.cloopen.com:8883",
  submail: "https://api-v4.mysubmail.com",
  chuanglan: "https://smssh1.253.com",
  twilio: "https://api.twilio.com",
  // The generic gateway has no fixed host; the operator supplies it.
  generic_http: null,
};

const EXPECTED_REGIONS: Partial<Record<(typeof WIRE_PROVIDERS)[number], string>> = {
  aliyun: "cn-hangzhou",
  tencent: "ap-guangzhou",
  huawei: "cn-north-4",
};

interface SeedAccountRow {
  readonly id: string;
  readonly uuid: string;
  readonly tenantId: number;
  readonly organizationId: number;
  readonly name: string;
  readonly provider: string;
  readonly config: Record<string, unknown>;
  readonly enabled: string;
}

interface SeedSignatureRow {
  readonly id: string;
  readonly uuid: string;
  readonly tenantId: number;
  readonly organizationId: number;
  readonly accountId: string;
  readonly signName: string;
  readonly enabled: string;
}

interface SeedRuleRow {
  readonly id: string;
  readonly tenantId: number;
  readonly organizationId: number;
  readonly scenario: string;
  readonly chain: string[];
  readonly enabled: string;
}

const ACCOUNT_ROW =
  /\(\s*(\d+),\s*'([^']+)',\s*(\d+),\s*(\d+),\s*'([^']*)',\s*'([a-z0-9_]+)',\s*'(\{[^']*\})'::jsonb,\s*(TRUE|FALSE),/gu;
const SIGNATURE_ROW =
  /\(\s*(\d+),\s*'([^']+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*'([^']+)',\s*(TRUE|FALSE),/gu;
const RULE_ROW =
  /\(\s*(\d+),\s*'([^']+)',\s*(\d+),\s*(\d+),\s*'([a-z_]+)',\s*'(\[[^']*\])'::jsonb,\s*(TRUE|FALSE),/gu;

function readSeedAccounts(): SeedAccountRow[] {
  return [...SEED_SQL.matchAll(ACCOUNT_ROW)].map((match) => ({
    id: match[1],
    uuid: match[2],
    tenantId: Number(match[3]),
    organizationId: Number(match[4]),
    name: match[5],
    provider: match[6],
    config: JSON.parse(match[7]) as Record<string, unknown>,
    enabled: match[8],
  }));
}

function readSeedSignatures(): SeedSignatureRow[] {
  return [...SEED_SQL.matchAll(SIGNATURE_ROW)].map((match) => ({
    id: match[1],
    uuid: match[2],
    tenantId: Number(match[3]),
    organizationId: Number(match[4]),
    accountId: match[5],
    signName: match[6],
    enabled: match[7],
  }));
}

function readSeedRules(): SeedRuleRow[] {
  return [...SEED_SQL.matchAll(RULE_ROW)].map((match) => ({
    id: match[1],
    tenantId: Number(match[3]),
    organizationId: Number(match[4]),
    scenario: match[5],
    chain: JSON.parse(match[6]) as string[],
    enabled: match[7],
  }));
}

describe("SMS provider catalog", () => {
  it("covers every wire provider exactly once", () => {
    expect([...SMS_PROVIDER_IDS].sort()).toEqual([...WIRE_PROVIDERS].sort());
    expect(SMS_PROVIDER_CATALOG).toHaveLength(WIRE_PROVIDERS.length);
  });

  it("presets the documented endpoint and region for every provider", () => {
    for (const provider of WIRE_PROVIDERS) {
      const entry = smsProviderCatalogEntry(provider);
      expect(entry, `${provider} must be catalogued`).toBeDefined();
      const config = smsProviderConfigDefaults(entry!);
      const expectedEndpoint = EXPECTED_ENDPOINTS[provider];
      if (expectedEndpoint) {
        expect(
          config.endpoint ?? config.apiBaseUrl,
          `${provider} must preset its endpoint`,
        ).toBe(expectedEndpoint);
      } else {
        expect(config, "generic_http must not invent a host").toEqual({});
      }
      const expectedRegion = EXPECTED_REGIONS[provider];
      if (expectedRegion) {
        expect(config.region, `${provider} must preset its region`).toBe(expectedRegion);
      }
    }
  });

  it("keeps per-tenant identifiers empty instead of inventing them", () => {
    const perTenantKeys = [
      "accessKeyId",
      "secretId",
      "appKey",
      "appId",
      "accountSid",
      "account",
    ];
    for (const entry of SMS_PROVIDER_CATALOG) {
      const config = smsProviderConfigDefaults(entry);
      for (const key of perTenantKeys) {
        expect(config[key], `${entry.provider}.${key} must stay operator-owned`).toBeUndefined();
      }
    }
  });
});

describe("SMS channel initialization seed", () => {
  it("seeds one account row per catalog provider for the default tenant", () => {
    const accounts = readSeedAccounts();
    expect(accounts).toHaveLength(SMS_PROVIDER_CATALOG.length);
    expect(new Set(accounts.map((row) => row.provider))).toEqual(
      new Set(SMS_PROVIDER_CATALOG.map((entry) => entry.provider)),
    );
    for (const row of accounts) {
      expect(row.tenantId).toBe(SEED_TENANT_ID);
      expect(row.organizationId).toBe(SEED_ORGANIZATION_ID);
      expect(row.enabled).toBe(row.provider === "tencent" ? "TRUE" : "FALSE");
    }
  });

  it("keeps the seeded config identical to the frontend preset", () => {
    const accounts = readSeedAccounts();
    for (const entry of SMS_PROVIDER_CATALOG) {
      const row = accounts.find((candidate) => candidate.provider === entry.provider);
      expect(row, `${entry.provider} must be seeded`).toBeDefined();
      expect(row?.config, `${entry.provider} seed preset`).toEqual(
        smsProviderConfigDefaults(entry),
      );
    }
  });

  it("seeds one signature per provider account and one chain per scenario", () => {
    const accounts = readSeedAccounts();
    const tencentAccount = accounts.find((row) => row.provider === "tencent");
    expect(tencentAccount, "tencent sms account").toBeDefined();
    const signatures = readSeedSignatures();
    expect(signatures).toHaveLength(accounts.length);
    const accountIds = accounts.map((row) => row.id);
    for (const signature of signatures) {
      expect(signature.tenantId).toBe(SEED_TENANT_ID);
      expect(signature.organizationId).toBe(SEED_ORGANIZATION_ID);
      expect(accountIds).toContain(signature.accountId);
      expect(signature.signName).toBe("BirdCoder");
      expect(signature.enabled).toBe(
        signature.accountId === tencentAccount!.id ? "TRUE" : "FALSE",
      );
    }

    const rules = readSeedRules();
    expect(rules.map((row) => row.scenario).sort()).toEqual([
      "default",
      "marketing",
      "system_notification",
      "verification_code",
    ]);
    const tencentSignature = signatures.find(
      (row) => row.accountId === tencentAccount!.id,
    );
    expect(tencentSignature).toBeDefined();
    const expectedChain = [
      tencentSignature!.id,
      ...signatures
        .filter((row) => row.id !== tencentSignature!.id)
        .map((row) => row.id),
    ];
    for (const rule of rules) {
      expect(rule.tenantId).toBe(SEED_TENANT_ID);
      expect(rule.organizationId).toBe(SEED_ORGANIZATION_ID);
      expect(rule.chain).toEqual(expectedChain);
      // Tencent Cloud SMS is the enabled default path.
      expect(rule.enabled).toBe("TRUE");
    }
  });

  it("defaults SMS delivery to Tencent Cloud", () => {
    const entry = smsProviderCatalogEntry("tencent");
    expect(entry, "tencent sms provider").toBeDefined();
    expect(entry?.provider).toBe(SMS_PROVIDER_CATALOG[0]?.provider);

    const account = readSeedAccounts().find((row) => row.provider === "tencent");
    expect(account?.enabled).toBe("TRUE");
    expect(account?.config.endpoint).toBe("https://sms.tencentcloudapi.com");
    expect(account?.config.region).toBe("ap-guangzhou");

    const signature = readSeedSignatures().find(
      (row) => row.accountId === account!.id,
    );
    expect(signature?.signName).toBe("BirdCoder");
    expect(signature?.enabled).toBe("TRUE");
    for (const rule of readSeedRules()) {
      expect(rule.chain[0]).toBe(signature!.id);
      expect(rule.enabled).toBe("TRUE");
    }
  });

  it("uses deterministic reserved ids that never collide with the email seed", () => {
    const ids = [
      ...readSeedAccounts().map((row) => row.id),
      ...readSeedSignatures().map((row) => row.id),
      ...readSeedRules().map((row) => row.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith("9500000"), `reserved seed id ${id}`).toBe(true);
    }
    // SMS accounts/signatures/rules live in their own 04xx/05xx/06xx blocks.
    for (const id of readSeedAccounts().map((row) => row.id)) {
      expect(id.slice(0, 10)).toBe("9500000004");
    }
    for (const id of readSeedSignatures().map((row) => row.id)) {
      expect(id.slice(0, 10)).toBe("9500000005");
    }
    for (const id of readSeedRules().map((row) => row.id)) {
      expect(id.slice(0, 10)).toBe("9500000006");
    }
    // Re-seeding must never overwrite operator edits.
    expect(SEED_SQL.match(/\nON CONFLICT DO NOTHING;/gu)).toHaveLength(3);
  });
});
