import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  defaultSampleValues,
  extractTemplateVariables,
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

const ROW_PATTERN =
  /\(\s*(\d+),\s*'([^']+)',\s*(\d+),\s*(\d+),\s*'(email|sms)',\s*'([a-z0-9_]+)',\s*'([^']*)',\s*(NULL|'[^']*'),\s*'([^']*)',\s*'(\[[^']*\])'::jsonb,\s*'([a-z_]+)',\s*(NULL|'[^']*'),\s*'(draft|active|disabled)',/gu;

function parseRows(sql: string): TemplateSeedRow[] {
  return [...sql.matchAll(ROW_PATTERN)].map((match) => {
    const rawSubject = match[8];
    const rawNote = match[12];
    return {
      id: match[1],
      uuid: match[2],
      tenantId: Number(match[3]),
      organizationId: Number(match[4]),
      channel: match[5] as "email" | "sms",
      code: match[6],
      name: match[7],
      subject: rawSubject === "NULL" ? null : rawSubject.slice(1, -1),
      content: match[9],
      variables: JSON.parse(match[10]) as string[],
      approvalStatus: match[11],
      approvalNote: rawNote === "NULL" ? null : rawNote.slice(1, -1),
      status: match[13],
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

const EMAIL_CODES = [
  "verification_code",
  "password_reset",
  "register_welcome",
  "order_paid",
  "payment_failed",
  "subscription_expiring",
  "quota_warning",
  "security_alert",
  "invoice_ready",
  "marketing_campaign",
];

describe("localized template seed manifest", () => {
  it("registers one locale file per active locale in the standard profile", () => {
    const standard = SEED_MANIFEST.profiles.standard;
    expect(standard?.locales["zh-CN"]).toEqual(["001_message_templates.sql"]);
    expect(standard?.locales["en-US"]).toEqual(["001_message_templates.sql"]);
    expect(SEED_MANIFEST.profiles.minimal.locales["zh-CN"]).toEqual([]);
  });

  it("declares locale sets whose checksums match the registered file lists", () => {
    for (const { locale } of LOCALES) {
      const set = SEED_MANIFEST.localeSets[locale];
      expect(set, `${locale} locale set`).toBeDefined();
      expect(set.version).toBe(SEED_MANIFEST.i18nVersion);
      const expected = createHash("sha256")
        .update(JSON.stringify(set.files))
        .digest("hex");
      expect(set.checksum).toBe(`sha256:${expected}`);
      expect(set.files).toEqual([`locales/${locale}/001_message_templates.sql`]);
    }
  });

  it("seeds every active locale from the same template code catalog", () => {
    for (const rowLocale of ROWS_BY_LOCALE.values()) {
      const email = rowLocale.filter((row) => row.channel === "email");
      const sms = rowLocale.filter((row) => row.channel === "sms");
      expect(email.map((row) => row.code)).toEqual(EMAIL_CODES);
      expect(sms.map((row) => row.code)).toEqual(EMAIL_CODES);
    }
  });
});

describe("localized template seed content", () => {
  for (const { locale } of LOCALES) {
    describe(locale, () => {
      const rows = ROWS_BY_LOCALE.get(locale)!;

      it("targets the canonical installation scope with deterministic reserved ids", () => {
        expect(rows).toHaveLength(20);
        expect(new Set(rows.map((row) => row.id)).size).toBe(20);
        expect(new Set(rows.map((row) => row.uuid)).size).toBe(20);
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

      it("keeps every SMS template within a single billed segment", () => {
        for (const row of rows.filter((candidate) => candidate.channel === "sms")) {
          const samples = defaultSampleValues(row.variables);
          const rendered = renderTemplatePreview(row.content, samples);
          const metrics = smsMetrics(rendered);
          expect(metrics.segments, `${row.code} (${metrics.characters} chars)`).toBe(1);
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
