import type { MessagingVerificationPolicy } from './messaging-verification-policy';
import type { PageInfo } from './page-info';

export interface MessagingVerificationPoliciesListResponse {
  code: 0;
  data: unknown & { items: MessagingVerificationPolicy[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
