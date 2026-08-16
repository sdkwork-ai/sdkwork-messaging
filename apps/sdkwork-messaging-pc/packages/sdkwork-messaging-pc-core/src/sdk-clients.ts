import { createClient as createMessagingAppClient, type SdkworkAppClient } from "@sdkwork/messaging-app-sdk";
import type { AuthTokenManager } from "@sdkwork/sdk-common";

export interface MessagingPcSdkClients {
  messaging: SdkworkAppClient;
}

export function createMessagingPcSdkClients(
  appApiBaseUrl: string,
  tokenManager: AuthTokenManager,
): MessagingPcSdkClients {
  const messaging = createMessagingAppClient({
    baseUrl: appApiBaseUrl,
    tokenManager,
  });
  messaging.setTokenManager(tokenManager);
  return { messaging };
}


// Admin notify surface types are re-exported from the messaging backend SDK
// through this core package so feature packages never import generated SDK
// modules directly (verify-repo SDK ownership rule).
export type {
  SdkworkBackendClient as MessagingBackendSdkClient,
  MessagingChannel,
  MessagingChannelUpdateRequest,
  MessagingTemplate,
  MessagingTemplateCreateRequest,
  MessagingTemplateUpdateRequest,
} from "@sdkwork/messaging-backend-sdk";
