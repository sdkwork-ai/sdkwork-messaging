import type { MessagingNotificationReceiptResponse } from './messaging-notification-receipt-response';

export interface MessagingNotificationsReadResponse {
  code: 0;
  data: unknown & { item: MessagingNotificationReceiptResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
