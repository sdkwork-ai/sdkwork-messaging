import type { MessagingOutboundMessage } from './messaging-outbound-message';
import type { PageInfo } from './page-info';

export interface MessagingOutboundMessageListResponse {
  items: MessagingOutboundMessage[];
  pageInfo: PageInfo;
}
