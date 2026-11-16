import type { MessagingSendRecord } from './messaging-send-record';
import type { PageInfo } from './page-info';

export interface MessagingSendRecordListResponse {
  items: MessagingSendRecord[];
  pageInfo: PageInfo;
}
