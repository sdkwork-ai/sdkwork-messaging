import { describe, expect, it } from "vitest";
import { parseMessagingPcRuntimeConfig } from "./runtime-config.ts";

const BROWSER_ORIGIN = "http://127.0.0.1:4176";

function baseDocument(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    environment: "development",
    deploymentProfile: "standalone",
    profileId: "standalone.development",
    runtimeTarget: "browser",
    browserOriginMode: "same-origin",
    appApiBaseUrl: "/",
    appbaseAppApiBaseUrl: "/",
    supportedLocales: ["zh-CN", "en-US"],
    activeLocales: ["zh-CN", "en-US"],
    defaultLocale: "zh-CN",
    fallbackLocale: "en-US",
    ...overrides,
  };
}

describe("parseMessagingPcRuntimeConfig base-URL lifecycle matrix", () => {
  it("resolves the standalone dev document against the page origin (same-origin ip+port)", () => {
    const config = parseMessagingPcRuntimeConfig(baseDocument({}), BROWSER_ORIGIN);
    expect(config.browserOriginMode).toBe("same-origin");
    expect(config.appApiBaseUrl).toBe(BROWSER_ORIGIN);
    expect(config.appbaseAppApiBaseUrl).toBe(BROWSER_ORIGIN);
  });

  it("accepts the canonical same-origin dev document in cloud development (server-side fan-out)", () => {
    const config = parseMessagingPcRuntimeConfig(
      baseDocument({
        environment: "development",
        deploymentProfile: "cloud",
        profileId: "cloud.development",
      }),
      BROWSER_ORIGIN,
    );
    expect(config.browserOriginMode).toBe("same-origin");
    expect(config.appApiBaseUrl).toBe(BROWSER_ORIGIN);
    expect(config.appbaseAppApiBaseUrl).toBe(BROWSER_ORIGIN);
  });

  it("keeps absolute origins for built cloud cross-origin documents", () => {
    const config = parseMessagingPcRuntimeConfig(
      baseDocument({
        environment: "production",
        deploymentProfile: "cloud",
        profileId: "cloud.production",
        browserOriginMode: "cross-origin",
        appApiBaseUrl: "https://api.sdkwork.com",
        appbaseAppApiBaseUrl: "https://api.sdkwork.com",
      }),
    );
    expect(config.appApiBaseUrl).toBe("https://api.sdkwork.com");
    expect(config.appbaseAppApiBaseUrl).toBe("https://api.sdkwork.com");
  });

  it("rejects a same-origin-shaped cloud document outside development", () => {
    expect(() =>
      parseMessagingPcRuntimeConfig(
        baseDocument({
          environment: "production",
          deploymentProfile: "cloud",
          profileId: "cloud.production",
        }),
        BROWSER_ORIGIN,
      ),
    ).toThrow(/cross-origin/u);
  });

  it("rejects the dev same-origin shape when a base carries a non-canonical value", () => {
    expect(() =>
      parseMessagingPcRuntimeConfig(
        baseDocument({
          environment: "development",
          deploymentProfile: "cloud",
          profileId: "cloud.development",
          appApiBaseUrl: "https://api-dev.sdkwork.com",
        }),
        BROWSER_ORIGIN,
      ),
    ).toThrow(/canonical dev same-origin root/u);
  });

  it("still rejects loopback origins in built cloud production documents", () => {
    expect(() =>
      parseMessagingPcRuntimeConfig(
        baseDocument({
          environment: "production",
          deploymentProfile: "cloud",
          profileId: "cloud.production",
          browserOriginMode: "cross-origin",
          appApiBaseUrl: "http://127.0.0.1:3900",
          appbaseAppApiBaseUrl: "http://127.0.0.1:3900",
        }),
      ),
    ).toThrow(/loopback/u);
  });
});
