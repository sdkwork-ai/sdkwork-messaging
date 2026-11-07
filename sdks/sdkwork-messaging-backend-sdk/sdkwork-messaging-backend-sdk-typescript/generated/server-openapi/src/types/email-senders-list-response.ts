import type { MessagingEmailSender } from './messaging-email-sender';
import type { PageInfo } from './page-info';

export interface EmailSendersListResponse {
  code: 0;
  data: unknown & { items: MessagingEmailSender[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
