import type { MessagingTemplate } from './messaging-template';
import type { PageInfo } from './page-info';

export interface MessagingTemplatesListResponse {
  code: 0;
  data: unknown & { items: MessagingTemplate[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
