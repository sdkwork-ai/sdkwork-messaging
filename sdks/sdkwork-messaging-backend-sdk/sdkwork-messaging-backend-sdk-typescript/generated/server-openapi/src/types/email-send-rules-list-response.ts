import type { MessagingEmailSendRule } from './messaging-email-send-rule';
import type { PageInfo } from './page-info';

export interface EmailSendRulesListResponse {
  code: 0;
  data: unknown & { items: MessagingEmailSendRule[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
