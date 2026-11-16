import type { MessagingProviderInitializeResponse } from './messaging-provider-initialize-response';

export interface EmailProvidersInitializeResponse {
  code: 0;
  data: unknown & { item: MessagingProviderInitializeResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
