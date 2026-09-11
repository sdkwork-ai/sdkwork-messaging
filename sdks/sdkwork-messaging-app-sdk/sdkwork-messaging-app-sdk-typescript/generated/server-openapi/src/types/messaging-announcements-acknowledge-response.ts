import type { MessagingAnnouncementReceiptResponse } from './messaging-announcement-receipt-response';

export interface MessagingAnnouncementsAcknowledgeResponse {
  code: 0;
  data: unknown & { item: MessagingAnnouncementReceiptResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
