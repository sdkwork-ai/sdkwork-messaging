import type { MessagingVerificationPolicyResponse } from './messaging-verification-policy-response';

export interface VerificationPoliciesUpdateResponse {
  code: 0;
  data: unknown & { item: MessagingVerificationPolicyResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
