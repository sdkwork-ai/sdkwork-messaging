export type MessagingLifecycleEnvironment = "development" | "test" | "staging" | "demo" | "production";
export type MessagingDeploymentProfile = "standalone" | "cloud";
export type MessagingBrowserOriginMode = "same-origin" | "cross-origin";
export type MessagingLocale = "en-US" | "zh-CN";

export interface MessagingPcRuntimeConfig {
  activeLocales: MessagingLocale[];
  appApiBaseUrl: string;
  appbaseAppApiBaseUrl: string;
  browserOriginMode: MessagingBrowserOriginMode;
  defaultLocale: MessagingLocale;
  deploymentProfile: MessagingDeploymentProfile;
  environment: MessagingLifecycleEnvironment;
  fallbackLocale: MessagingLocale;
  profileId: `${MessagingDeploymentProfile}.${MessagingLifecycleEnvironment}`;
  runtimeTarget: "browser";
  supportedLocales: MessagingLocale[];
}

export async function loadMessagingPcRuntimeConfig(
  fetcher: typeof fetch = fetch,
  browserOrigin: string | undefined = currentBrowserOrigin(),
): Promise<MessagingPcRuntimeConfig> {
  const response = await fetcher("/runtime-env.json", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Runtime configuration failed with HTTP ${response.status}`);
  return parseMessagingPcRuntimeConfig(await response.json(), browserOrigin);
}

export function parseMessagingPcRuntimeConfig(
  value: unknown,
  browserOrigin?: string,
): MessagingPcRuntimeConfig {
  if (!isRecord(value)) throw new Error("Runtime configuration must be an object");
  const environment = readEnum(value.environment, ["development", "test", "staging", "demo", "production"] as const, "environment");
  const deploymentProfile = readEnum(value.deploymentProfile, ["standalone", "cloud"] as const, "deploymentProfile");
  const profileId = readProfileId(value.profileId, deploymentProfile, environment);
  const runtimeTarget = readEnum(value.runtimeTarget, ["browser"] as const, "runtimeTarget");
  const browserOriginMode = readEnum(value.browserOriginMode, ["same-origin", "cross-origin"] as const, "browserOriginMode");
  const supportedLocales = readLocales(value.supportedLocales, "supportedLocales");
  const activeLocales = readLocales(value.activeLocales, "activeLocales");
  const defaultLocale = readEnum(value.defaultLocale, ["en-US", "zh-CN"] as const, "defaultLocale");
  const fallbackLocale = readEnum(value.fallbackLocale, ["en-US", "zh-CN"] as const, "fallbackLocale");
  if (!supportedLocales.includes(defaultLocale) || !supportedLocales.includes(fallbackLocale) || activeLocales.some((locale) => !supportedLocales.includes(locale))) {
    throw new Error("Locale configuration is inconsistent");
  }
  const baseUrls = deploymentProfile === "standalone"
    ? readStandaloneBaseUrls(value, browserOrigin, browserOriginMode)
    : readCloudBaseUrls(value, environment, browserOriginMode);
  return { activeLocales, ...baseUrls, browserOriginMode, defaultLocale, deploymentProfile, environment, fallbackLocale, profileId, runtimeTarget, supportedLocales };
}

export function resolveMessagingLocale(
  config: MessagingPcRuntimeConfig,
  preferredLocales: readonly string[],
): MessagingLocale {
  for (const preferred of preferredLocales) {
    const normalized = preferred.toLowerCase().startsWith("zh")
      ? "zh-CN"
      : preferred.toLowerCase().startsWith("en") ? "en-US" : undefined;
    if (normalized && config.activeLocales.includes(normalized)) return normalized;
  }
  return config.activeLocales.includes(config.defaultLocale) ? config.defaultLocale : config.fallbackLocale;
}

function readStandaloneBaseUrls(
  value: Record<string, unknown>,
  browserOrigin: string | undefined,
  browserOriginMode: MessagingBrowserOriginMode,
) {
  if (browserOriginMode !== "same-origin") throw new Error("standalone browserOriginMode must equal same-origin");
  const origin = readBrowserOrigin(browserOrigin);
  for (const field of ["appApiBaseUrl", "appbaseAppApiBaseUrl"] as const) {
    if (value[field] !== "/") throw new Error(`${field} must use the canonical standalone same-origin root /`);
  }
  return { appApiBaseUrl: origin, appbaseAppApiBaseUrl: origin };
}

function readCloudBaseUrls(
  value: Record<string, unknown>,
  environment: MessagingLifecycleEnvironment,
  browserOriginMode: MessagingBrowserOriginMode,
) {
  if (browserOriginMode !== "cross-origin") throw new Error("cloud browserOriginMode must equal cross-origin");
  return {
    appApiBaseUrl: readUrl(value.appApiBaseUrl, "appApiBaseUrl", environment),
    appbaseAppApiBaseUrl: readUrl(value.appbaseAppApiBaseUrl, "appbaseAppApiBaseUrl", environment),
  };
}

function readBrowserOrigin(value: string | undefined): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("browser origin is required for standalone runtime config");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("browser origin must be an absolute HTTP(S) origin");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("browser origin must be an absolute HTTP(S) origin");
  }
  return url.origin;
}

function readUrl(value: unknown, field: string, environment: MessagingLifecycleEnvironment): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute HTTP(S) URL`);
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${field} must be an absolute HTTP(S) URL`);
  }
  if (environment === "production" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(`${field} cannot use a loopback host in production`);
  }
  return url.toString().replace(/\/$/, "");
}

function readProfileId(
  value: unknown,
  deploymentProfile: MessagingDeploymentProfile,
  environment: MessagingLifecycleEnvironment,
): `${MessagingDeploymentProfile}.${MessagingLifecycleEnvironment}` {
  const expected = `${deploymentProfile}.${environment}` as const;
  if (value !== expected) throw new Error(`profileId must equal ${expected}`);
  return expected;
}

function readLocales(value: unknown, field: string): MessagingLocale[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${field} is required`);
  return [...new Set(value.map((locale) => readEnum(locale, ["en-US", "zh-CN"] as const, field)))];
}

function readEnum<const Values extends readonly string[]>(
  value: unknown,
  allowed: Values,
  field: string,
): Values[number] {
  if (typeof value !== "string" || !allowed.includes(value)) throw new Error(`${field} is invalid`);
  return value as Values[number];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function currentBrowserOrigin(): string | undefined {
  return typeof window === "undefined" ? undefined : window.location.origin;
}

