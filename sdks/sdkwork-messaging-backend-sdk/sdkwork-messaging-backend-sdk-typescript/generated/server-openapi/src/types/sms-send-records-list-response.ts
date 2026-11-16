import type { MessagingSendRecord } from './messaging-send-record';
import type { PageInfo } from './page-info';

export interface SmsSendRecordsListResponse {
  code: 0;
  data: unknown & { items: MessagingSendRecord[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
