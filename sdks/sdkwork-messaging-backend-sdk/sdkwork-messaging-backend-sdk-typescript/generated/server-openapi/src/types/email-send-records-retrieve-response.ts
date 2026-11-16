import type { MessagingSendRecord } from './messaging-send-record';

export interface EmailSendRecordsRetrieveResponse {
  code: 0;
  data: unknown & { item: MessagingSendRecord; };
  /** Server-owned request correlation id. */
  traceId: string;
}
