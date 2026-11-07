import type { MessagingEmailSender } from './messaging-email-sender';
import type { PageInfo } from './page-info';

export interface MessagingEmailSenderListResponse {
  items: MessagingEmailSender[];
  pageInfo: PageInfo;
}
