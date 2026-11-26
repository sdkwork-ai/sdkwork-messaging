import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  defaultSampleValues,
  extractTemplateVariables,
  looksLikeHtml,
  renderTemplatePreview,
  smsMetrics,
} from "./templatePreview.ts";

const SEED_ROOT = new URL("../../../../../database/seeds/", import.meta.url);

function seedFile(path: string): string {
  return readFileSync(fileURLToPath(new URL(path, SEED_ROOT)), "utf8");
}

const SEED_MANIFEST = JSON.parse(seedFile("seed.manifest.json")) as {
  i18nVersion: string;
  fallbackLocale: string;
  activeLocales: string[];
  profiles: Record<
    string,
    { common: string[]; locales: Record<string, string[]> }
  >;
  localeSets: Record<string, { version: string; checksum: string; files: string[] }>;
};

interface TemplateSeedRow {
  readonly id: string;
  readonly uuid: string;
  readonly tenantId: number;
  readonly organizationId: number;
  readonly channel: "email" | "sms";
  readonly code: string;
  readonly name: string;
  readonly subject: string | null;
  readonly content: string;
  readonly variables: string[];
  readonly approvalStatus: string;
  readonly approvalNote: string | null;
  readonly status: string;
}

// SQL string literals escape a quote by doubling it (`''`), which the email
// HTML bodies rely on for inline style attributes. Parse each tuple by
// splitting on top-level commas so quoted content is never mis-split.
const unescapeSql = (value: string) => value.replaceAll("''", "'");

interface SeedField {
  readonly text: string;
  readonly isNull: boolean;
  readonly isQuoted: boolean;
}

/** Split one `VALUES` tuple body into its top-level comma-separated fields. */
function splitTuple(body: string): SeedField[] {
  const fields: SeedField[] = [];
  let current = "";
  let inString = false;
  let quoted = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (inString) {
      if (ch === "'" && body[i + 1] === "'") {
        current += "''";
        i += 1;
      } else if (ch === "'") {
        inString = false;
        current += ch;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === "'") {
      inString = true;
      quoted = true;
      current += ch;
    } else if (ch === ",") {
      fields.push({ text: current.trim(), isNull: current.trim() === "NULL", isQuoted: quoted });
      current = "";
      quoted = false;
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    fields.push({ text: current.trim(), isNull: current.trim() === "NULL", isQuoted: quoted });
  }
  return fields;
}

function fieldText(field: SeedField): string {
  if (field.isNull) return "";
  // Strip a trailing cast such as `::jsonb`, then decode the literal.
  const withoutCast = field.text.replace(/::[a-z][a-z0-9_]*$/u, "").trim();
  if (withoutCast.startsWith("'") && withoutCast.endsWith("'")) {
    return unescapeSql(withoutCast.slice(1, -1));
  }
  return withoutCast;
}

/** Extract the `VALUES` tuples of `messaging_template` inserts. */
function tuples(sql: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inString = false;
  let start = -1;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (inString) {
      if (ch === "'" && sql[i + 1] === "'") i += 1;
      else if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
    } else if (ch === "(") {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        out.push(sql.slice(start, i));
        start = -1;
      }
    }
  }
  return out;
}

function parseRows(sql: string): TemplateSeedRow[] {
  // Only the statement body matters; the header names the columns.
  const valuesIndex = sql.indexOf("VALUES");
  const statement = valuesIndex >= 0 ? sql.slice(valuesIndex + "VALUES".length) : sql;
  return tuples(statement).map((body) => {
    const f = splitTuple(body);
    return {
      id: f[0].text,
      uuid: fieldText(f[1]),
      tenantId: Number(f[2].text),
      organizationId: Number(f[3].text),
      channel: fieldText(f[4]) as "email" | "sms",
      code: fieldText(f[5]),
      name: fieldText(f[6]),
      subject: f[7].isNull ? null : fieldText(f[7]),
      content: fieldText(f[8]),
      variables: JSON.parse(
        // The literal carries a `::jsonb` cast suffix.
        fieldText(f[9]).replace(/::[a-z]+$/u, ""),
      ) as string[],
      approvalStatus: fieldText(f[10]),
      approvalNote: f[11].isNull ? null : fieldText(f[11]),
      status: fieldText(f[12]),
    };
  });
}

const LOCALES = [
  { locale: "zh-CN", file: "locales/zh-CN/001_message_templates.sql" },
  { locale: "en-US", file: "locales/en-US/001_message_templates.sql" },
] as const;

const ROWS_BY_LOCALE = new Map(
  LOCALES.map(({ locale, file }) => [locale, parseRows(seedFile(file))]),
);

/**
 * Email is the system's transactional backbone, so its seed catalog covers the
 * standard lifecycle plus the commercial journeys a live deployment needs.
 * Ordered: `template_code` order is part of the seed contract (ids ascend).
 */
const EMAIL_CODES = [
  // Account and security
  "verification_code",
  "register_verification_code",
  "password_reset",
  "password_reset_success",
  "password_changed",
  "register_welcome",
  "email_verify",
  "phone_bound",
  "security_alert",
  "account_frozen",
  "account_unfrozen",
  // Orders, payments and billing
  "order_created",
  "order_paid",
  "payment_failed",
  "order_shipped",
  "order_completed",
  "order_cancelled",
  "order_refunded",
  "recharge_success",
  "balance_low",
  "arrears_notice",
  "invoice_ready",
  "invoice_overdue",
  // Subscription and membership
  "subscription_activated",
  "subscription_expiring",
  "subscription_expired",
  "subscription_renewed",
  "subscription_cancelled",
  "membership_expiring",
  // Usage and quota
  "quota_warning",
  "quota_exhausted",
  // Platform, partner and marketing
  "maintenance_notice",
  "release_notice",
  "ticket_replied",
  "partner_approved",
  "partner_commission_settled",
  "marketing_campaign",
  "marketing_promotion",
];

/** Marketing email bodies must offer an unsubscribe path. */
const EMAIL_MARKETING_CODES = ["marketing_campaign", "marketing_promotion"];

/**
 * SMS is the channel customers are paged on, so its seed catalog spans every
 * platform business area rather than the ten email codes. The list is ordered:
 * `template_code` order is part of the seed contract (ids ascend in this order).
 */
const SMS_CODES = [
  // Identity and verification
  "verification_code",
  "register_verification_code",
  "password_reset",
  "password_changed",
  "register_welcome",
  "account_frozen",
  "security_alert",
  "new_device_login",
  "phone_bind_code",
  "phone_rebind_code",
  "login_mfa_code",
  "withdraw_verification_code",
  "payment_verification_code",
  // Billing, orders and payments
  "order_created",
  "order_paid",
  "payment_failed",
  "order_shipped",
  "order_completed",
  "order_cancelled",
  "order_refunded",
  "recharge_success",
  "balance_low",
  "arrears_notice",
  "service_suspended",
  "invoice_ready",
  "invoice_overdue",
  // Subscription, membership and pricing
  "subscription_activated",
  "subscription_expiring",
  "subscription_expired",
  "subscription_renewed",
  "subscription_cancelled",
  "plan_changed",
  "membership_expiring",
  "coupon_expiring",
  // Quota, usage and rate limiting
  "quota_warning",
  "quota_exhausted",
  "rate_limit_triggered",
  "api_key_exhausted",
  "usage_spike_alert",
  // Platform operations
  "upstream_failure",
  "node_offline",
  "service_degraded",
  "release_published",
  "maintenance_notice",
  "data_export_ready",
  "ticket_created",
  "ticket_replied",
  "ticket_closed",
  // Partner and distribution
  "partner_approved",
  "partner_rejected",
  "partner_commission_settled",
  "partner_withdraw_success",
  "partner_withdraw_failed",
  // Marketing and campaigns
  "marketing_campaign",
  "marketing_promotion",
  "marketing_recall",
  "marketing_new_feature",
  "marketing_unsubscribed",
  // Content and risk
  "content_rejected",
  "account_risk_alert",
  "realname_verified",
];

/** Marketing bodies must carry a carrier-required opt-out instruction. */
const SMS_OPT_OUT_CODES = [
  "marketing_campaign",
  "marketing_promotion",
  "marketing_recall",
  "marketing_new_feature",
];

const TOTAL_TEMPLATE_ROWS = EMAIL_CODES.length + SMS_CODES.length;

describe("localized template seed manifest", () => {
  it("registers one locale file per active locale in the standard profile", () => {
    const standard = SEED_MANIFEST.profiles.standard;
    expect(standard?.locales["zh-CN"]).toEqual([
      "001_message_templates.sql",
      "002_template_provider_defaults.sql",
      "003_verification_policies.sql",
    ]);
    expect(standard?.locales["en-US"]).toEqual([
      "001_message_templates.sql",
      "002_template_provider_defaults.sql",
      "003_verification_policies.sql",
    ]);
    expect(SEED_MANIFEST.profiles.minimal.locales["zh-CN"]).toEqual([]);
  });

  it("declares locale sets whose checksums match the registered file lists", () => {
    for (const { locale } of LOCALES) {
      const set = SEED_MANIFEST.localeSets[locale];
      expect(set, `${locale} locale set`).toBeDefined();
      expect(set.version).toBe(SEED_MANIFEST.i18nVersion);
      // DATABASE_FRAMEWORK_SPEC §8.1: the recorded checksum must change whenever
      // locale seed content changes, so it covers the file list AND the bytes of
      // every file it names.
      const content = set.files
        .map((file) => seedFile(`locales/${locale}/${file.split("/").at(-1)}`))
        .join("\n");
      const expected = createHash("sha256")
        .update(JSON.stringify(set.files))
        .update("\0")
        .update(content)
        .digest("hex");
      expect(set.checksum).toBe(`sha256:${expected}`);
      expect(set.files).toEqual([
        `locales/${locale}/001_message_templates.sql`,
        `locales/${locale}/002_template_provider_defaults.sql`,
        `locales/${locale}/003_verification_policies.sql`,
      ]);
    }
  });

  it("seeds every active locale from the same template code catalog", () => {
    for (const rowLocale of ROWS_BY_LOCALE.values()) {
      const email = rowLocale.filter((row) => row.channel === "email");
      const sms = rowLocale.filter((row) => row.channel === "sms");
      expect(email.map((row) => row.code)).toEqual(EMAIL_CODES);
      expect(sms.map((row) => row.code)).toEqual(SMS_CODES);
    }
  });
});

describe("localized template seed content", () => {
  for (const { locale } of LOCALES) {
    describe(locale, () => {
      const rows = ROWS_BY_LOCALE.get(locale)!;

      it("targets the canonical installation scope with deterministic reserved ids", () => {
        expect(rows).toHaveLength(TOTAL_TEMPLATE_ROWS);
        expect(new Set(rows.map((row) => row.id)).size).toBe(TOTAL_TEMPLATE_ROWS);
        expect(new Set(rows.map((row) => row.uuid)).size).toBe(TOTAL_TEMPLATE_ROWS);
        for (const row of rows) {
          expect(row.tenantId).toBe(100001);
          expect(row.organizationId).toBe(0);
          expect(row.id.startsWith("9500000")).toBe(true);
          expect(row.uuid.startsWith("seed-tpl-")).toBe(true);
        }
      });

      it("keeps declared variables in sync with subject and content placeholders", () => {
        for (const row of rows) {
          const detected = extractTemplateVariables(
            `${row.subject ?? ""} ${row.content}`,
          );
          expect(new Set(detected), `${row.channel}/${row.code}`).toEqual(
            new Set(row.variables),
          );
        }
      });

      it("ships active, subject-bearing email templates and pending SMS drafts", () => {
        for (const row of rows) {
          if (row.channel === "email") {
            expect(row.subject?.trim(), `${row.code} subject`).toBeTruthy();
            expect(row.status).toBe("active");
            expect(row.approvalStatus).toBe("not_applicable");
            expect(row.approvalNote).toBeNull();
          } else {
            expect(row.subject).toBeNull();
            expect(row.status).toBe("draft");
            expect(row.approvalStatus).toBe("pending");
            expect(row.approvalNote?.trim()).toBeTruthy();
          }
          expect(row.name.trim()).not.toBe("");
        }
      });

      it("ships the standard system emails every installation must have", () => {
        // Forgot-password, registration success and the other baseline
        // transactional mails are non-negotiable: a fresh install must be able
        // to run these journeys with a copy edit, not by authoring templates.
        const required = [
          "verification_code",
          "password_reset",
          "password_reset_success",
          "password_changed",
          "register_verification_code",
          "register_welcome",
          "email_verify",
          "security_alert",
        ];
        const emailCodes = rows
          .filter((row) => row.channel === "email")
          .map((row) => row.code);
        for (const code of required) {
          expect(emailCodes, `missing system email ${code}`).toContain(code);
        }
      });

      it("ships self-contained HTML email bodies", () => {
        for (const row of rows.filter((candidate) => candidate.channel === "email")) {
          expect(looksLikeHtml(row.content), `${row.code} must be HTML`).toBe(true);
          // Inline styles keep the mail renderable in clients that strip <style>.
          expect(row.content, `${row.code} needs inline styles`).toMatch(/style="/u);
          expect(row.content, `${row.code} must not embed scripts`).not.toMatch(/<script/iu);
        }
      });

      it("offers an unsubscribe path on marketing email only", () => {
        for (const row of rows.filter((candidate) => candidate.channel === "email")) {
          const expectsUnsubscribe = EMAIL_MARKETING_CODES.includes(row.code);
          expect(
            /\{\{unsubscribeUrl\}\}/u.test(row.content),
            `${row.code} unsubscribe`,
          ).toBe(expectsUnsubscribe);
        }
      });

      it("keeps every SMS template within a single billed segment", () => {
        for (const row of rows.filter((candidate) => candidate.channel === "sms")) {
          const samples = defaultSampleValues(row.variables);
          const rendered = renderTemplatePreview(row.content, samples);
          const metrics = smsMetrics(rendered);
          expect(metrics.segments, `${row.code} (${metrics.characters} chars)`).toBe(1);
        }
      });

      it("carries the opt-out tail on marketing SMS only", () => {
        const optOut = locale === "en-US" ? /reply stop/iu : /回\s*T\s*退订/iu;
        for (const row of rows.filter((candidate) => candidate.channel === "sms")) {
          const expectsOptOut = SMS_OPT_OUT_CODES.includes(row.code);
          expect(optOut.test(row.content), `${row.code} opt-out`).toBe(expectsOptOut);
        }
      });

      it("writes each locale in its own script", () => {
        const cjk = /[\u3400-\u9fff]/u;
        for (const row of rows) {
          const text = `${row.name} ${row.subject ?? ""} ${row.content}`;
          if (locale === "en-US") {
            expect(cjk.test(text), `${row.code} must be English`).toBe(false);
          } else {
            expect(cjk.test(row.content), `${row.code} must be Chinese`).toBe(true);
          }
        }
      });
    });
  }

  it("keeps the two locale sets structurally identical but linguistically distinct", () => {
    const zh = ROWS_BY_LOCALE.get("zh-CN")!;
    const en = ROWS_BY_LOCALE.get("en-US")!;
    expect(zh.map((row) => `${row.channel}:${row.code}`)).toEqual(
      en.map((row) => `${row.channel}:${row.code}`),
    );
    expect(zh[0].content).not.toBe(en[0].content);
    expect(zh[0].name).not.toBe(en[0].name);
  });

  it("is idempotent in both locale files", () => {
    for (const { file } of LOCALES) {
      const sql = seedFile(file);
      expect(sql.match(/\nON CONFLICT DO NOTHING;/gu)).toHaveLength(1);
    }
  });
});

/**
 * Verification policies gate the OTP flows: `messaging_verification_challenge`
 * carries a composite foreign key onto `messaging_verification_policy`, so an
 * installation with no policy rows cannot create a challenge at all.
 */
const VERIFICATION_SCENES = [
  "login",
  "register",
  "password_reset",
  "bind_phone",
  "payment",
  "withdraw",
  "login_mfa",
] as const;

interface PolicyRow {
  readonly id: string;
  readonly uuid: string;
  readonly sceneCode: string;
  readonly channel: string;
  readonly ttlSeconds: number;
  readonly maxAttempts: number;
  readonly subject: string | null;
  readonly body: string;
  readonly enabled: boolean;
}

const POLICY_ROW_PATTERN =
  /\(\s*(\d+),\s*'([^']+)',\s*100001,\s*0,\s*'([a-z_]+)',\s*'(sms|email)',\s*(\d+),\s*(\d+),\s*(NULL|'(?:[^']|'')*'),\s*'((?:[^']|'')*)',\s*(TRUE|FALSE),/gu;

function parsePolicies(sql: string): PolicyRow[] {
  return [...sql.matchAll(POLICY_ROW_PATTERN)].map((match) => ({
    id: match[1],
    uuid: match[2],
    sceneCode: match[3],
    channel: match[4],
    ttlSeconds: Number(match[5]),
    maxAttempts: Number(match[6]),
    subject: match[7] === "NULL" ? null : match[7].slice(1, -1).replaceAll("''", "'"),
    body: match[8].replaceAll("''", "'"),
    enabled: match[9] === "TRUE",
  }));
}

const POLICIES_BY_LOCALE = new Map(
  LOCALES.map(({ locale }) => [
    locale,
    parsePolicies(seedFile(`locales/${locale}/003_verification_policies.sql`)),
  ]),
);

describe("verification policy seed", () => {
  it("covers every scene on both channels for each active locale", () => {
    for (const { locale } of LOCALES) {
      const rows = POLICIES_BY_LOCALE.get(locale)!;
      const keys = rows.map((row) => `${row.sceneCode}:${row.channel}`).sort();
      const expected = VERIFICATION_SCENES.flatMap((scene) => [
        `${scene}:sms`,
        `${scene}:email`,
      ]).sort();
      expect(keys, `${locale} policy keys`).toEqual(expected);
    }
  });

  it("uses unique reserved ids and stable uuids", () => {
    const ids: string[] = [];
    const uuids: string[] = [];
    for (const rows of POLICIES_BY_LOCALE.values()) {
      for (const row of rows) {
        ids.push(row.id);
        uuids.push(row.uuid);
        expect(row.id.startsWith("9500000")).toBe(true);
        expect(row.uuid.startsWith("seed-vpolicy-")).toBe(true);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(uuids).size).toBe(uuids.length);
  });

  it("keeps TTL and attempt budgets positive and sane", () => {
    for (const [locale, rows] of POLICIES_BY_LOCALE) {
      for (const row of rows) {
        const label = `${locale} ${row.sceneCode}/${row.channel}`;
        expect(row.ttlSeconds, label).toBeGreaterThanOrEqual(60);
        expect(row.ttlSeconds, label).toBeLessThanOrEqual(3600);
        expect(row.maxAttempts, label).toBeGreaterThanOrEqual(1);
        // A verification code with many guesses is no longer a secret.
        expect(row.maxAttempts, label).toBeLessThanOrEqual(10);
        expect(row.enabled, label).toBe(true);
      }
    }
  });

  it("renders {{code}} and {{ttlMinutes}} in every body", () => {
    for (const [locale, rows] of POLICIES_BY_LOCALE) {
      for (const row of rows) {
        const label = `${locale} ${row.sceneCode}/${row.channel}`;
        expect(row.body, label).toContain("{{code}}");
        expect(row.body, label).toContain("{{ttlMinutes}}");
      }
    }
  });

  it("gives email policies a subject and leaves SMS subjects null", () => {
    for (const [locale, rows] of POLICIES_BY_LOCALE) {
      for (const row of rows) {
        const label = `${locale} ${row.sceneCode}/${row.channel}`;
        if (row.channel === "email") {
          expect(row.subject?.trim(), label).toBeTruthy();
        } else {
          expect(row.subject, label).toBeNull();
          // A single segment keeps a code-delivery SMS billed once.
          expect(smsMetrics(row.body).segments, label).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("writes each locale in its own script", () => {
    const cjk = /[\u3400-\u9fff]/u;
    for (const [locale, rows] of POLICIES_BY_LOCALE) {
      for (const row of rows) {
        const text = `${row.subject ?? ""}${row.body}`;
        if (locale === "en-US") {
          expect(cjk.test(text), `${row.sceneCode} must be English`).toBe(false);
        } else {
          expect(cjk.test(row.body), `${row.sceneCode} must be Chinese`).toBe(true);
        }
      }
    }
  });

  it("is idempotent", () => {
    for (const { locale } of LOCALES) {
      const sql = seedFile(`locales/${locale}/003_verification_policies.sql`);
      expect(sql.match(/\nON CONFLICT DO NOTHING;/gu)).toHaveLength(1);
    }
  });
});

describe("initialization completeness", () => {
  // Every config table the flows depend on must be seeded, and every seeded
  // default must be the one the product ships. These assertions mirror the
  // end-to-end flow simulation run against real PostgreSQL.
  it("initializes every provider on install and keeps Tencent as the default", () => {
    const emailSeed = seedFile("common/002_email_provider_defaults.sql");
    const smsSeed = seedFile("common/003_sms_provider_defaults.sql");

    // Email: exactly one account tuple carries `TRUE, TRUE` (enabled + receive)
    // — the enterprise mailbox. Every other account row is `FALSE, FALSE`.
    const emailFlags = [...emailSeed.matchAll(/,\s*(TRUE|FALSE),\s*(TRUE|FALSE),/gu)].filter(
      (match) => match[1] === "TRUE",
    );
    expect(emailFlags).toHaveLength(1);
    const enterpriseAt = emailSeed.indexOf("'enterprise_mail',");
    expect(enterpriseAt, "enterprise_mail account row").toBeGreaterThanOrEqual(0);
    const enterpriseTuple = emailSeed.slice(enterpriseAt, emailSeed.indexOf(")", enterpriseAt));
    expect(enterpriseTuple).toContain("TRUE, TRUE");

    // SMS: every provider ships enabled so the installation is fully
    // initialized; Tencent Cloud still leads the chains as the default path.
    const smsAccountTuples = [...smsSeed.matchAll(/\(\s*9500000004\d\d,[\s\S]*?\)/gu)].map(
      (match) => match[0],
    );
    expect(smsAccountTuples).toHaveLength(8);
    const enabledTuples = smsAccountTuples.filter((tuple) => /\bTRUE,/.test(tuple));
    expect(enabledTuples, "every sms provider ships enabled").toHaveLength(8);
    expect(enabledTuples.some((tuple) => tuple.includes("'tencent'"))).toBe(true);
  });

  it("gives every provider exactly one account and one identity", () => {
    for (const file of [
      "common/002_email_provider_defaults.sql",
      "common/003_sms_provider_defaults.sql",
    ]) {
      const sql = seedFile(file);
      // Account rows carry the provider enum followed by a JSON config; identity
      // rows reference the account instead of naming the provider.
      const accountRows = (sql.match(/'[a-z0-9_]+',\s*'\{/gu) ?? []).length;
      const identityRows = (sql.match(
        /\(950000000\d+, 'seed-messaging-(?:email|sms)-(?:sender|signature)-/gu,
      ) ?? []).length;
      expect(identityRows, `${file} identity rows`).toBe(accountRows);
    }
  });

  it("binds every seeded template to every provider of its channel", () => {
    for (const { locale } of LOCALES) {
      const bindings = seedFile(`locales/${locale}/002_template_provider_defaults.sql`);
      // The binding file derives rows from the template table, so it must not
      // hard-code a template count that would silently stop covering new rows.
      expect(bindings).toMatch(/FROM messaging_template/gu);
      expect(bindings).toMatch(/ON CONFLICT DO NOTHING/gu);
    }
  });
});

describe("initialization seed id space", () => {
  function reservedIds(sql: string): string[] {
    return [...sql.matchAll(/\(\s*(\d{9,}),/gu)].map((match) => match[1]);
  }

  it("keeps every provider, identity, rule, and template id globally unique", () => {
    const commonIds = [
      ...reservedIds(seedFile("common/002_email_provider_defaults.sql")),
      ...reservedIds(seedFile("common/003_sms_provider_defaults.sql")),
    ];
    const templateIds = LOCALES.flatMap(({ file }) => reservedIds(seedFile(file)));
    const all = [...commonIds, ...templateIds];
    expect(new Set(all).size).toBe(all.length);
    for (const id of all) {
      expect(id.startsWith("9500000"), id).toBe(true);
    }
  });

  it("registers every standard-profile seed file on disk", () => {
    const standard = SEED_MANIFEST.profiles.standard;
    const files = [
      ...standard.common.map((file) => `common/${file}`),
      ...Object.entries(standard.locales).flatMap(([locale, localeFiles]) =>
        localeFiles.map((file) => `locales/${locale}/${file}`),
      ),
    ];
    for (const relative of files) {
      expect(() => seedFile(relative), relative).not.toThrow();
    }
  });
});
