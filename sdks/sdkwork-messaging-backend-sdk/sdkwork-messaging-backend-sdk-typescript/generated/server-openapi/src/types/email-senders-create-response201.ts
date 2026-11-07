import type { MessagingEmailSenderResponse } from './messaging-email-sender-response';

export interface EmailSendersCreateResponse201 {
  code: 0;
  data: unknown & { item: MessagingEmailSenderResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
