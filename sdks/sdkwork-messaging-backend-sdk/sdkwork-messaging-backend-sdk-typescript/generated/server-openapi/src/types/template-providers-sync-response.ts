import type { MessagingTemplateProviderSyncResponse } from './messaging-template-provider-sync-response';

export interface TemplateProvidersSyncResponse {
  code: 0;
  data: unknown & { item: MessagingTemplateProviderSyncResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
