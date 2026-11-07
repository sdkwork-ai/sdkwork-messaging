import type { MessagingSmsSignatureResponse } from './messaging-sms-signature-response';

export interface SmsSignaturesRetrieveResponse {
  code: 0;
  data: unknown & { item: MessagingSmsSignatureResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
