import type { MessagingEmailSenderResponse } from './messaging-email-sender-response';

export interface EmailSendersRetrieveResponse {
  code: 0;
  data: unknown & { item: MessagingEmailSenderResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
