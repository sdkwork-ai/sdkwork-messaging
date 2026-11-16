import type { MessagingTemplateProviderBinding } from './messaging-template-provider-binding';
import type { PageInfo } from './page-info';

export interface TemplateProvidersListResponse {
  code: 0;
  data: unknown & { items: MessagingTemplateProviderBinding[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
