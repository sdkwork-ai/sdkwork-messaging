import type { MessagingSmsSendRule } from './messaging-sms-send-rule';
import type { PageInfo } from './page-info';

export interface MessagingSmsSendRuleListResponse {
  items: MessagingSmsSendRule[];
  pageInfo: PageInfo;
}
