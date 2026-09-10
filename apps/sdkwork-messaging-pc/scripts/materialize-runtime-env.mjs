#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPLOYMENT_CONFIG_PATH = path.join(APP_ROOT, "etc", "sdkwork.deployment.config.json");
const SUPPORTED_ENVIRONMENTS = new Set(["development", "test", "staging", "demo", "production"]);
const SUPPORTED_PROFILES = new Set(["standalone", "cloud"]);
const SDK_BASE_URL_KEYS = ["appApiBaseUrl", "appbaseAppApiBaseUrl"];

function option(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
}

export function resolveSource(deploymentProfile, environment) {
  const profileId = `${deploymentProfile}.${environment}`;
  const deployment = JSON.parse(readFileSync(DEPLOYMENT_CONFIG_PATH, "utf8"));
  const sourcePath = deployment.profiles?.[profileId]?.source;
  if (typeof sourcePath !== "string" || !sourcePath) {
    throw new Error(`deployment config does not declare browser source for ${profileId}`);
  }
  const source = path.resolve(path.dirname(DEPLOYMENT_CONFIG_PATH), sourcePath);
  if (!existsSync(source)) {
    throw new Error(`browser runtime source does not exist for ${profileId}: ${sourcePath}`);
  }
  const value = JSON.parse(readFileSync(source, "utf8"));
  validateRuntimeSource(value, { deploymentProfile, environment, sourcePath });
  return { path: source, value };
}

export function validateRuntimeSource(value, { deploymentProfile, environment, sourcePath = "<runtime-source>" }) {
  const profileId = `${deploymentProfile}.${environment}`;
  if (value.deploymentProfile !== deploymentProfile || value.environment !== environment || value.profileId !== profileId) {
    throw new Error(`browser runtime source identity does not match ${profileId}: ${sourcePath}`);
  }
  if (value.runtimeTarget !== "browser") {
    throw new Error(`browser runtime source runtimeTarget must equal browser: ${sourcePath}`);
  }
  if (deploymentProfile === "standalone") {
    if (value.browserOriginMode !== "same-origin") {
      throw new Error(`${profileId}.browserOriginMode must equal same-origin`);
    }
    for (const key of SDK_BASE_URL_KEYS) {
      if (value[key] !== "/") throw new Error(`${profileId}.${key} must use the canonical same-origin root /`);
    }
    return;
  }
  if (value.browserOriginMode !== "cross-origin") {
    throw new Error(`${profileId}.browserOriginMode must equal cross-origin`);
  }
  for (const key of SDK_BASE_URL_KEYS) validateAbsoluteHttpUrl(value[key], `${profileId}.${key}`);
}

function validateAbsoluteHttpUrl(value, field) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute HTTP(S) URL`);
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${field} must be an absolute HTTP(S) URL`);
  }
}

function main() {
  const argv = process.argv.slice(2);
  const deploymentProfile = option(argv, "--deployment-profile", "standalone");
  const environment = option(argv, "--environment", "development");
  const check = argv.includes("--check");
  if (!SUPPORTED_PROFILES.has(deploymentProfile)) throw new Error(`unsupported deployment profile: ${deploymentProfile}`);
  if (!SUPPORTED_ENVIRONMENTS.has(environment)) throw new Error(`unsupported environment: ${environment}`);
  const source = resolveSource(deploymentProfile, environment);
  const deployment = JSON.parse(readFileSync(DEPLOYMENT_CONFIG_PATH, "utf8"));
  const output = path.resolve(path.dirname(DEPLOYMENT_CONFIG_PATH), deployment.materialization.output);
  const desired = `${JSON.stringify(source.value, null, 2)}\n`;
  if (check) {
    const current = existsSync(output) ? readFileSync(output, "utf8").replace(/\r\n/g, "\n") : null;
    if (current !== desired) throw new Error(`public/runtime-env.json is stale for ${deploymentProfile}.${environment}`);
    return;
  }
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, desired, "utf8");
  console.log(`[sdkwork-messaging-pc] materialized ${deploymentProfile}.${environment}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`[sdkwork-messaging-pc] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

