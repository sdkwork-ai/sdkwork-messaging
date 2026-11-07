import type { MessagingSmsSignature } from './messaging-sms-signature';
import type { PageInfo } from './page-info';

export interface SmsSignaturesListResponse {
  code: 0;
  data: unknown & { items: MessagingSmsSignature[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
