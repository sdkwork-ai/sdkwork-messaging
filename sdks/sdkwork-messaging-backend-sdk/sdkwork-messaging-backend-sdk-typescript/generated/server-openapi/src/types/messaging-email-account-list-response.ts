import type { MessagingEmailAccount } from './messaging-email-account';
import type { PageInfo } from './page-info';

export interface MessagingEmailAccountListResponse {
  items: MessagingEmailAccount[];
  pageInfo: PageInfo;
}
