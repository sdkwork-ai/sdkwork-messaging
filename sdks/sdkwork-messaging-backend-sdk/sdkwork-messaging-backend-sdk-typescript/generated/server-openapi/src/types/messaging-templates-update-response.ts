import type { MessagingTemplateResponse } from './messaging-template-response';

export interface MessagingTemplatesUpdateResponse {
  code: 0;
  data: unknown & { item: MessagingTemplateResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
