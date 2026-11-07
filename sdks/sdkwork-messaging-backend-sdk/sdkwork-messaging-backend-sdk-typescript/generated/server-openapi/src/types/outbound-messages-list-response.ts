import type { MessagingOutboundMessage } from './messaging-outbound-message';
import type { PageInfo } from './page-info';

export interface OutboundMessagesListResponse {
  code: 0;
  data: unknown & { items: MessagingOutboundMessage[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
