import type { MessagingSmsSignature } from './messaging-sms-signature';
import type { PageInfo } from './page-info';

export interface MessagingSmsSignatureListResponse {
  items: MessagingSmsSignature[];
  pageInfo: PageInfo;
}
