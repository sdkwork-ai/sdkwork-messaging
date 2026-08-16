import type { MessagingAnnouncement } from './messaging-announcement';
import type { PageInfo } from './page-info';

export interface MessagingAnnouncementListResponse {
  items: MessagingAnnouncement[];
  pageInfo: PageInfo;
}
