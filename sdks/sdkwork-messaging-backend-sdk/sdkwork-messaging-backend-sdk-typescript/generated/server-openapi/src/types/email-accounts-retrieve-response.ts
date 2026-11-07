import type { MessagingEmailAccountResponse } from './messaging-email-account-response';

export interface EmailAccountsRetrieveResponse {
  code: 0;
  data: unknown & { item: MessagingEmailAccountResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
