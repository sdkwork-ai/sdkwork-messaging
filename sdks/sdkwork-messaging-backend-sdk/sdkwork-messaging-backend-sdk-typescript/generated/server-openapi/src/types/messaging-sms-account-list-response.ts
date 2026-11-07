import type { MessagingSmsAccount } from './messaging-sms-account';
import type { PageInfo } from './page-info';

export interface MessagingSmsAccountListResponse {
  items: MessagingSmsAccount[];
  pageInfo: PageInfo;
}
