import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  normalizeEncryption,
  parseEmailAccountConfig,
  serializeEmailAccountConfig,
} from "./emailAccountConfig.ts";
import {
  EMAIL_PROVIDER_CATALOG,
  EMAIL_PROVIDER_IDS,
  emailProviderCatalogEntry,
  providerConfigDefaults,
} from "./emailProviderCatalog.ts";

const SEED_PATH = fileURLToPath(
  new URL(
    "../../../../../database/seeds/common/002_email_provider_defaults.sql",
    import.meta.url,
  ),
);
const SEED_SQL = readFileSync(SEED_PATH, "utf8");

const SEED_TENANT_ID = 100001;
const SEED_ORGANIZATION_ID = 0;

/** Wire enum of `messaging_email_account.provider` (OpenAPI authority). */
const WIRE_PROVIDERS = [
  "smtp",
  "enterprise_mail",
  "aliyun",
  "tencent",
  "tencent_mail",
  "mail_139",
  "gmail",
  "microsoft",
  "sendgrid",
  "mailgun",
  "amazon_ses",
  "postmark",
  "resend",
] as const;

const MAILBOX_PROVIDERS = [
  "enterprise_mail",
  "tencent_mail",
  "mail_139",
  "gmail",
  "microsoft",
] as const;

interface SeedAccountRow {
  readonly id: string;
  readonly uuid: string;
  readonly tenantId: number;
  readonly organizationId: number;
  readonly name: string;
  readonly provider: string;
  readonly config: Record<string, unknown>;
  readonly enabled: string;
  readonly receiveEnabled: string;
}

interface SeedSenderRow {
  readonly id: string;
  readonly tenantId: number;
  readonly organizationId: number;
  readonly accountId: string;
  readonly fromAddress: string;
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
  /\(\s*(\d+),\s*'([^']+)',\s*(\d+),\s*(\d+),\s*'([^']*)',\s*'([a-z0-9_]+)',\s*'(\{[^']*\})'::jsonb,\s*(TRUE|FALSE),\s*(TRUE|FALSE),/gu;
const SENDER_ROW =
  /\(\s*(\d+),\s*'([^']+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*'([^']+)',\s*'[^']*',\s*(TRUE|FALSE),/gu;
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
    receiveEnabled: match[9],
  }));
}

function readSeedSenders(): SeedSenderRow[] {
  return [...SEED_SQL.matchAll(SENDER_ROW)].map((match) => ({
    id: match[1],
    uuid: match[2],
    tenantId: Number(match[3]),
    organizationId: Number(match[4]),
    accountId: match[5],
    fromAddress: match[6],
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

describe("email provider catalog", () => {
  it("covers every wire provider exactly once", () => {
    expect([...EMAIL_PROVIDER_IDS].sort()).toEqual([...WIRE_PROVIDERS].sort());
    expect(EMAIL_PROVIDER_CATALOG).toHaveLength(WIRE_PROVIDERS.length);
  });

  it("presets send and receive endpoints for consumer mailbox services", () => {
    for (const provider of MAILBOX_PROVIDERS) {
      const entry = emailProviderCatalogEntry(provider);
      expect(entry, `${provider} must be catalogued`).toBeDefined();
      expect(entry?.transport).toBe("smtp");
      expect(entry?.send?.host, `${provider} send host`).toBeTruthy();
      expect(entry?.send?.port, `${provider} send port`).toBeTruthy();
      expect(entry?.receive?.imap.host, `${provider} IMAP host`).toBeTruthy();
      expect(entry?.receive?.imap.port, `${provider} IMAP port`).toBe("993");
      expect(entry?.receive?.pop3.host, `${provider} POP3 host`).toBeTruthy();
      expect(entry?.receive?.pop3.port, `${provider} POP3 port`).toBe("995");
    }
  });

  it("keeps delivery providers send-only", () => {
    for (const provider of ["aliyun", "tencent", "amazon_ses", "sendgrid", "mailgun", "postmark", "resend", "smtp"]) {
      const entry = emailProviderCatalogEntry(provider);
      expect(entry, `${provider} must be catalogued`).toBeDefined();
      expect(entry?.receive, `${provider} must stay send-only`).toBeUndefined();
      expect(providerConfigDefaults(entry!).receiveProtocol).toBe("none");
    }
  });

  it("documents the provider-specific credential label for each preset", () => {
    const labels = new Map<string, string[]>();
    for (const entry of EMAIL_PROVIDER_CATALOG) {
      const providers = labels.get(entry.secretLabelKey) ?? [];
      providers.push(entry.provider);
      labels.set(entry.secretLabelKey, providers);
    }
    expect(labels.get("admin.notify.email.secretLabel.authCode")).toEqual([
      "enterprise_mail",
      "tencent_mail",
      "mail_139",
    ]);
    expect(labels.get("admin.notify.email.secretLabel.appPassword")).toEqual([
      "gmail",
      "microsoft",
    ]);
  });
});

describe("email account config", () => {
  it("round-trips every provider preset without losing endpoints", () => {
    for (const entry of EMAIL_PROVIDER_CATALOG) {
      const defaults = providerConfigDefaults(entry);
      const parsed = parseEmailAccountConfig(defaults);
      expect(serializeEmailAccountConfig(parsed), `${entry.provider} preset round-trip`).toEqual(
        defaults,
      );
    }
  });

  it("reads the retired flat legacy shape and normalizes smtps", () => {
    const parsed = parseEmailAccountConfig({
      host: "smtp.legacy.example.com",
      port: "465",
      encryption: "smtps",
    });
    expect(parsed.transport).toBe("smtp");
    expect(parsed.send).toEqual({
      host: "smtp.legacy.example.com",
      port: "465",
      encryption: "ssl",
    });
    expect(parsed.receiveProtocol).toBe("none");
    expect(normalizeEncryption("smtps")).toBe("ssl");
  });
});

describe("email channel initialization seed", () => {
  it("seeds one account row per catalog provider for the default tenant", () => {
    const accounts = readSeedAccounts();
    expect(accounts).toHaveLength(EMAIL_PROVIDER_CATALOG.length);
    expect(new Set(accounts.map((row) => row.provider))).toEqual(
      new Set(EMAIL_PROVIDER_CATALOG.map((entry) => entry.provider)),
    );
    for (const row of accounts) {
      expect(row.tenantId).toBe(SEED_TENANT_ID);
      expect(row.organizationId).toBe(SEED_ORGANIZATION_ID);
      if (row.provider === "enterprise_mail") {
        // The default enterprise mailbox is ready except for its secret.
        expect(row.enabled).toBe("TRUE");
        expect(row.receiveEnabled).toBe("TRUE");
      } else {
        expect(row.enabled).toBe("FALSE");
        expect(row.receiveEnabled).toBe("FALSE");
      }
    }
  });

  it("keeps the seeded config identical to the frontend preset", () => {
    const accounts = readSeedAccounts();
    for (const entry of EMAIL_PROVIDER_CATALOG) {
      const row = accounts.find((candidate) => candidate.provider === entry.provider);
      expect(row, `${entry.provider} must be seeded`).toBeDefined();
      expect(row?.config, `${entry.provider} seed preset`).toEqual(
        providerConfigDefaults(entry),
      );
    }
  });

  it("seeds one sender identity per provider account plus one chain per scenario", () => {
    const accounts = readSeedAccounts();
    const enterpriseAccount = accounts.find((row) => row.provider === "enterprise_mail");
    expect(enterpriseAccount, "enterprise mailbox account").toBeDefined();
    const senders = readSeedSenders();
    expect(senders).toHaveLength(accounts.length);
    const accountIds = accounts.map((row) => row.id);
    for (const sender of senders) {
      expect(sender.tenantId).toBe(SEED_TENANT_ID);
      expect(sender.organizationId).toBe(SEED_ORGANIZATION_ID);
      expect(accountIds).toContain(sender.accountId);
      expect(sender.fromAddress).toMatch(/^no-reply@birdcoder\.com$/u);
      expect(sender.enabled).toBe(
        sender.accountId === enterpriseAccount!.id ? "TRUE" : "FALSE",
      );
    }

    const rules = readSeedRules();
    expect(rules.map((row) => row.scenario).sort()).toEqual([
      "default",
      "marketing",
      "system_notification",
      "verification_code",
    ]);
    const enterpriseSender = senders.find(
      (row) => row.accountId === enterpriseAccount!.id,
    );
    expect(enterpriseSender).toBeDefined();
    const expectedChain = [
      enterpriseSender!.id,
      ...senders
        .filter((row) => row.id !== enterpriseSender!.id)
        .map((row) => row.id),
    ];
    for (const rule of rules) {
      expect(rule.tenantId).toBe(SEED_TENANT_ID);
      expect(rule.organizationId).toBe(SEED_ORGANIZATION_ID);
      expect(rule.chain).toEqual(expectedChain);
      // Enterprise delivery is the enabled default path.
      expect(rule.enabled).toBe("TRUE");
    }
  });

  it("defaults delivery to the birdcoder.com enterprise mailbox", () => {
    const entry = emailProviderCatalogEntry("enterprise_mail");
    expect(entry, "enterprise mailbox provider").toBeDefined();
    const defaults = providerConfigDefaults(entry!);
    expect(defaults.username).toBe("no-reply@birdcoder.com");
    expect(defaults.host).toBe("smtp.exmail.qq.com");
    expect(defaults.imapHost).toBe("imap.exmail.qq.com");
    expect(defaults.pop3Host).toBe("pop.exmail.qq.com");

    const account = readSeedAccounts().find((row) => row.provider === "enterprise_mail");
    expect(account?.enabled).toBe("TRUE");
    expect(account?.config.username).toBe("no-reply@birdcoder.com");

    const sender = readSeedSenders().find((row) => row.accountId === account!.id);
    expect(sender?.fromAddress).toBe("no-reply@birdcoder.com");
    expect(sender?.enabled).toBe("TRUE");
    for (const rule of readSeedRules()) {
      expect(rule.chain[0]).toBe(sender!.id);
      expect(rule.enabled).toBe("TRUE");
    }
  });

  it("uses deterministic reserved ids in one documented block", () => {
    const ids = [
      ...readSeedAccounts().map((row) => row.id),
      ...readSeedSenders().map((row) => row.id),
      ...readSeedRules().map((row) => row.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith("9500000"), `reserved seed id ${id}`).toBe(true);
    }
    // Re-seeding must never overwrite operator edits.
    expect(SEED_SQL.match(/\nON CONFLICT DO NOTHING;/gu)).toHaveLength(3);
  });
});
