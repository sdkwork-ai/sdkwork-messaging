import type { MessagingVerificationPolicy } from './messaging-verification-policy';
import type { PageInfo } from './page-info';

export interface MessagingVerificationPolicyListResponse {
  items: MessagingVerificationPolicy[];
  pageInfo: PageInfo;
}
