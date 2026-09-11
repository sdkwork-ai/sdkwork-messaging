import type { MessagingAnnouncement } from './messaging-announcement';
import type { PageInfo } from './page-info';
export interface MessagingAnnouncementListResponse {
    items: MessagingAnnouncement[];
    pageInfo: PageInfo;
    /** Server-owned request correlation id. */
    requestId: string;
}
//# sourceMappingURL=messaging-announcement-list-response.d.ts.map