import type { MessagingAnnouncementResponse } from './messaging-announcement-response';

export interface MessagingAnnouncementsCreateResponse201 {
  code: 0;
  data: unknown & { item: MessagingAnnouncementResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
