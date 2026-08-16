//! Messaging admin SDK client holder.
//!
//! The embedding host (sdkwork-cloudrouter admin shell) injects the composed
//! `@sdkwork/messaging-backend-sdk` client at startup; this package never
//! constructs transport clients or issues raw HTTP.

import type { MessagingBackendSdkClient } from "@sdkwork/messaging-pc-core";

let messagingBackendClient: MessagingBackendSdkClient | undefined;

export function configureMessagingBackendSdkClient(client: MessagingBackendSdkClient): void {
  messagingBackendClient = client;
}

export function messagingBackendSdkClient(): MessagingBackendSdkClient {
  if (!messagingBackendClient) {
    throw new Error(
      "messaging backend SDK client is not configured; the embedding host must call configureMessagingBackendSdkClient() before rendering admin pages",
    );
  }
  return messagingBackendClient;
}
