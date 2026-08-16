import type { MessagingPushMessage } from './messaging-push-message';
import type { PageInfo } from './page-info';

export interface MessagingPushMessageListResponse {
  items: MessagingPushMessage[];
  pageInfo: PageInfo;
}
