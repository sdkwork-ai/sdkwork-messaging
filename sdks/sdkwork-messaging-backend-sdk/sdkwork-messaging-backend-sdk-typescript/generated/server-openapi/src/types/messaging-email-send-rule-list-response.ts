import type { MessagingEmailSendRule } from './messaging-email-send-rule';
import type { PageInfo } from './page-info';

export interface MessagingEmailSendRuleListResponse {
  items: MessagingEmailSendRule[];
  pageInfo: PageInfo;
}
