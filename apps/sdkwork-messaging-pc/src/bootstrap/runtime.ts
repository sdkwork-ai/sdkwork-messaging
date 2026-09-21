import { createSdkworkIamRuntimeAuthController, type SdkworkIamRuntimeAuthRuntimeLike } from "@sdkwork/auth-pc-react";
import { createSdkworkAppbasePcAuthRuntime } from "@sdkwork/auth-runtime-pc-react";
import { createClient as createIamAppClient } from "@sdkwork/iam-app-sdk";
import { createPersistentIamTokenStore } from "@sdkwork/iam-runtime";
import {
  createMessagingPcSdkClients,
  createNotificationCenterService,
  loadMessagingPcRuntimeConfig,
  resolveMessagingLocale,
  type MessagingPcRuntimeConfig,
} from "@sdkwork/messaging-pc-core";
import { createTokenManager } from "@sdkwork/sdk-common";
import { createMessagingAuthRuntimeConfigLoader } from "../auth/auth-runtime-config.ts";

const MESSAGING_PC_APP_ID = "sdkwork-messaging-pc";

/**
 * Publishes the runtime document to the canonical browser global
 * (BROWSER_RUNTIME_ENV_SPEC.md §4, APP_RUNTIME_ENV_SPEC.md §4) BEFORE the
 * first SDK client call, including the deployment-mode aliases the shared
 * `@sdkwork/sdk-common` resolvers inspect (`readRuntimeEnv` reads this
 * bridge first; import.meta.env / process.env channels are unreliable in
 * bundled apps).
 */
function publishRuntimeEnvGlobalBridge(config: MessagingPcRuntimeConfig): void {
  const bridge = {
    environment: config.environment,
    deploymentProfile: config.deploymentProfile,
    profileId: config.profileId,
    browserOriginMode: config.browserOriginMode,
    appApiBaseUrl: config.appApiBaseUrl,
    appbaseAppApiBaseUrl: config.appbaseAppApiBaseUrl,
    SDKWORK_DEPLOYMENT_PROFILE: config.deploymentProfile,
    SDKWORK_DEPLOY_MODE: config.deploymentProfile,
    VITE_SDKWORK_DEPLOYMENT_PROFILE: config.deploymentProfile,
    VITE_SDKWORK_DEPLOY_MODE: config.deploymentProfile,
  };
  (globalThis as unknown as Record<string, unknown>).SDKWORK_RUNTIME_ENV = Object.freeze(bridge);
}

export async function bootstrapMessagingPcRuntime() {
  const config = await loadMessagingPcRuntimeConfig();
  publishRuntimeEnvGlobalBridge(config);
  const locale = resolveMessagingLocale(config, navigator.languages);
  const tokenManager = createTokenManager();
  const tokenStore = createPersistentIamTokenStore({ appId: MESSAGING_PC_APP_ID, storage: window.localStorage });
  const sdkClients = createMessagingPcSdkClients(config.appApiBaseUrl, tokenManager);
  const auth = createSdkworkAppbasePcAuthRuntime({
    app: {
      appId: MESSAGING_PC_APP_ID,
      deploymentMode: config.deploymentProfile === "cloud" ? "saas" : "local",
      environment: config.environment === "development" ? "dev" : config.environment === "test" ? "test" : "prod",
      platform: "pc",
    },
    baseUrls: { appbaseAppApiBaseUrl: config.appbaseAppApiBaseUrl },
    createAppbaseAppClient: (clientConfig) => createIamAppClient({ ...clientConfig, timeout: config.environment === "production" || config.environment === "staging" ? 10_000 : 5_000 }),
    localeProvider: () => locale,
    sdkClients: [sdkClients.messaging],
    sessionAuth: true,
    tokenManager,
    tokenStore,
  });
  await auth.runtime.hydrateTokenManager();
  const authController = createSdkworkIamRuntimeAuthController({
    getRuntime: () => auth.getRuntime() as unknown as SdkworkIamRuntimeAuthRuntimeLike,
  });
  return {
    auth,
    authController,
    config,
    loadAuthRuntimeConfig: createMessagingAuthRuntimeConfigLoader(auth.appbaseApp),
    locale,
    notificationService: createNotificationCenterService(sdkClients.messaging),
    sdkClients,
    tokenManager,
  } as const;
}

export type BootstrappedMessagingPcRuntime = Awaited<ReturnType<typeof bootstrapMessagingPcRuntime>>;

