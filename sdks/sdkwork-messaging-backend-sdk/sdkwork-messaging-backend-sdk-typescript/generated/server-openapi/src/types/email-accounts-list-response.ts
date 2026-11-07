import type { MessagingEmailAccount } from './messaging-email-account';
import type { PageInfo } from './page-info';

export interface EmailAccountsListResponse {
  code: 0;
  data: unknown & { items: MessagingEmailAccount[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
