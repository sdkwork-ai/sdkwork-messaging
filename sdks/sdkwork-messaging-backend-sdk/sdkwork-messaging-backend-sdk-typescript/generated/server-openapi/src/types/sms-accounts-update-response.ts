import type { MessagingSmsAccountResponse } from './messaging-sms-account-response';

export interface SmsAccountsUpdateResponse {
  code: 0;
  data: unknown & { item: MessagingSmsAccountResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
