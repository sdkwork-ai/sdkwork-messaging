import type { MessagingNotification } from './messaging-notification';
import type { PageInfo } from './page-info';

export interface MessagingNotificationsListResponse {
  code: 0;
  data: unknown & { items: MessagingNotification[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
