import type { MessagingNotificationResponse } from './messaging-notification-response';

export interface NotificationsCreateResponse201 {
  code: 0;
  data: unknown & { item: MessagingNotificationResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
