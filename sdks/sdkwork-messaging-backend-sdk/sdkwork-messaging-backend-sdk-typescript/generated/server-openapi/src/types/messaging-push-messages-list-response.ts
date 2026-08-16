import type { MessagingPushMessage } from './messaging-push-message';
import type { PageInfo } from './page-info';

export interface MessagingPushMessagesListResponse {
  code: 0;
  data: unknown & { items: MessagingPushMessage[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
