import type { MessagingAnnouncement } from './messaging-announcement';
import type { PageInfo } from './page-info';

export interface MessagingAnnouncementsListResponse {
  code: 0;
  data: unknown & { items: MessagingAnnouncement[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
