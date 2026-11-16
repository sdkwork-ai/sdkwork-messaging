import type { MessagingTemplateProviderResponse } from './messaging-template-provider-response';

export interface TemplateProvidersUpdateResponse {
  code: 0;
  data: unknown & { item: MessagingTemplateProviderResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
