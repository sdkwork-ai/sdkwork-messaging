import type { MessagingProviderInitializeResponse } from './messaging-provider-initialize-response';

export interface SmsProvidersInitializeResponse {
  code: 0;
  data: unknown & { item: MessagingProviderInitializeResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
