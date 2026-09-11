import type { MessagingNotification } from './messaging-notification';
import type { PageInfo } from './page-info';

export interface MessagingNotificationListResponse {
  items: MessagingNotification[];
  pageInfo: PageInfo;
}
