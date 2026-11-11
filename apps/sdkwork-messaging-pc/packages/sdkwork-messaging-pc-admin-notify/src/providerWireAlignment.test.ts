import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { EMAIL_PROVIDER_IDS } from "./emailProviderCatalog";
import { SMS_PROVIDER_IDS } from "./smsProviderCatalog";

const ROOT = new URL("../../../../../", import.meta.url);
const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, ROOT)), "utf8");

const BASELINE = read("database/ddl/baseline/postgres/0001_messaging_baseline.sql");
const RUST_PORTS = read("crates/sdkwork-routes-messaging-backend-api/src/ports.rs");

function constraintProviders(table: string): string[] {
  const constraint = BASELINE.split("\n").find((line) =>
    line.includes(`ck_${table}_provider`),
  );
  expect(constraint, `${table} provider constraint`).toBeDefined();
  return [...constraint!.matchAll(/'([a-z0-9_]+)'/gu)].map((match) => match[1]);
}

function rustFunction(name: string): string {
  const start = RUST_PORTS.indexOf(`pub fn ${name}`);
  expect(start, `${name} must exist`).toBeGreaterThanOrEqual(0);
  const end = RUST_PORTS.indexOf("\npub fn ", start + 1);
  return RUST_PORTS.slice(start, end === -1 ? undefined : end);
}

describe("provider wire alignment", () => {
  it("keeps the email provider enum aligned across catalog, database, and Rust", () => {
    const expected = new Set(EMAIL_PROVIDER_IDS);
    expect(new Set(constraintProviders("messaging_email_account"))).toEqual(expected);
    const parser = rustFunction("parse_email_provider");
    for (const provider of expected) {
      expect(parser, `Rust email parser must accept ${provider}`).toContain(
        `"${provider}" => Ok("${provider}")`,
      );
    }
  });

  it("keeps the SMS provider enum aligned across catalog, database, and Rust", () => {
    const expected = new Set(SMS_PROVIDER_IDS);
    expect(new Set(constraintProviders("messaging_sms_account"))).toEqual(expected);
    const parser = rustFunction("parse_sms_provider");
    for (const provider of expected) {
      expect(parser, `Rust SMS parser must accept ${provider}`).toContain(
        `"${provider}" => Ok("${provider}")`,
      );
    }
  });
});
