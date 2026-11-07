import type { MessagingSmsSendRuleResponse } from './messaging-sms-send-rule-response';

export interface SmsSendRulesUpdateResponse {
  code: 0;
  data: unknown & { item: MessagingSmsSendRuleResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
