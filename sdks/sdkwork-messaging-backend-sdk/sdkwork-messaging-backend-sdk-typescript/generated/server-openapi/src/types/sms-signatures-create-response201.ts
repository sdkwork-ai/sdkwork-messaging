import type { MessagingSmsSignatureResponse } from './messaging-sms-signature-response';

export interface SmsSignaturesCreateResponse201 {
  code: 0;
  data: unknown & { item: MessagingSmsSignatureResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
