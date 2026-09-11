import type { MessagingNotification } from './messaging-notification';
import type { PageInfo } from './page-info';
export interface MessagingNotificationListResponse {
    items: MessagingNotification[];
    pageInfo: PageInfo;
    /** Server-owned request correlation id. */
    requestId: string;
}
//# sourceMappingURL=messaging-notification-list-response.d.ts.map