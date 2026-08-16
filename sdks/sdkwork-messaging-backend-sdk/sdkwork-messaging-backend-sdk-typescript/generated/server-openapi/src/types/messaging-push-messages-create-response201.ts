import type { MessagingPushMessageResponse } from './messaging-push-message-response';

export interface MessagingPushMessagesCreateResponse201 {
  code: 0;
  data: unknown & { item: MessagingPushMessageResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
