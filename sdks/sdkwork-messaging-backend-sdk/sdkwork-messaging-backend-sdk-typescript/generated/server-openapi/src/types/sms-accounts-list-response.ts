import type { MessagingSmsAccount } from './messaging-sms-account';
import type { PageInfo } from './page-info';

export interface SmsAccountsListResponse {
  code: 0;
  data: unknown & { items: MessagingSmsAccount[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
