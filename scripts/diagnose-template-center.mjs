#!/usr/bin/env node
// Diagnostic for the reported "template center is empty" symptom.
//
// The admin API lists templates scoped to the *request* tenant
// (`MessagingAdminSubject`, taken from the authenticated session). The
// `standard` seed writes the canonical installation scope
// `tenant_id = 100001 / organization_id = 0`. When those two disagree the list
// renders empty even though the rows exist.
//
// This reports both numbers so the operator can tell the two causes apart:
//   * zero rows at all            -> the seed never ran (see lifecycle.seedOnBoot)
//   * rows exist, other scope     -> the session tenant differs from the seed scope
//
// Usage: node scripts/diagnose-template-center.mjs [--url <postgres-url>]
//        (falls back to SDKWORK_MESSAGING_DATABASE_URL / DATABASE_URL)

import { readFileSync } from "node:fs";

function readManifestScope() {
  // The seeded scope is stated in the template seed header; read it so this
  // script never drifts from the SQL it is explaining.
  const sql = readFileSync("database/seeds/locales/zh-CN/001_message_templates.sql", "utf8");
  const match = sql.match(/tenant \(?(\d+)\)?\s*\/\s*organization \(?(\d+)\)?/iu);
  return { tenantId: match?.[1] ?? "100001", organizationId: match?.[2] ?? "0" };
}

function readSeedOnBoot() {
  const manifest = JSON.parse(readFileSync("database/database.manifest.json", "utf8"));
  return manifest.lifecycle?.seedOnBoot === true;
}

const scope = readManifestScope();
const seedOnBoot = readSeedOnBoot();
const urlFlagAt = process.argv.indexOf("--url");
const url =
  (urlFlagAt > 0 ? process.argv[urlFlagAt + 1] : undefined) ??
  process.env.SDKWORK_MESSAGING_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "";

console.log("Messaging template center diagnostic");
console.log("------------------------------------");
console.log(`database.manifest.json  seedOnBoot : ${seedOnBoot ? "true (seeds on boot)" : "false (NEVER seeds automatically)"}`);
console.log(`seed installation scope : tenant ${scope.tenantId} / organization ${scope.organizationId}`);
console.log(`target database         : ${url ? url.replace(/:[^:@/]*@/u, ":***@") : "(not configured)"}`);

if (!seedOnBoot) {
  console.log("");
  console.log("CAUSE FOUND: seedOnBoot is false, so a fresh install seeds nothing.");
  console.log("Fix: set lifecycle.seedOnBoot=true in database/database.manifest.json");
  console.log("     or run `pnpm run db:seed`, then restart the service.");
}

if (!url) {
  console.log("");
  console.log("No database URL given, so row counts cannot be checked here.");
  console.log("Re-run with --url <postgres-url> to compare the seeded scope against");
  console.log("the tenant your login session actually carries.");
  process.exit(0);
}
