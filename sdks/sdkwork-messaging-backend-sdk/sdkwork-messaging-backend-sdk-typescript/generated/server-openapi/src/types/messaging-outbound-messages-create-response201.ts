import type { MessagingOutboundMessageResponse } from './messaging-outbound-message-response';

export interface MessagingOutboundMessagesCreateResponse201 {
  code: 0;
  data: unknown & { item: MessagingOutboundMessageResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
