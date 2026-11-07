import type { MessagingSmsSendRule } from './messaging-sms-send-rule';
import type { PageInfo } from './page-info';

export interface SmsSendRulesListResponse {
  code: 0;
  data: unknown & { items: MessagingSmsSendRule[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
