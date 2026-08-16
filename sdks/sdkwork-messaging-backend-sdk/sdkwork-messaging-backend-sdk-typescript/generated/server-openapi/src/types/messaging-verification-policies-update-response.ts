import type { MessagingVerificationPolicyResponse } from './messaging-verification-policy-response';

export interface MessagingVerificationPoliciesUpdateResponse {
  code: 0;
  data: unknown & { item: MessagingVerificationPolicyResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
