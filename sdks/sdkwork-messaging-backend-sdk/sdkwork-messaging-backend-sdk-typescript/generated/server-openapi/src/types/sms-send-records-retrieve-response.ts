import type { MessagingSendRecord } from './messaging-send-record';

export interface SmsSendRecordsRetrieveResponse {
  code: 0;
  data: unknown & { item: MessagingSendRecord; };
  /** Server-owned request correlation id. */
  traceId: string;
}
