import type { MessagingEmailSendRuleResponse } from './messaging-email-send-rule-response';

export interface EmailSendRulesUpdateResponse {
  code: 0;
  data: unknown & { item: MessagingEmailSendRuleResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
