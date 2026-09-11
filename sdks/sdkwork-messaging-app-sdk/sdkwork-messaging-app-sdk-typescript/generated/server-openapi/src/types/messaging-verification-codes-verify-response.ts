import type { MessagingVerificationCodeVerifyResponse } from './messaging-verification-code-verify-response';

export interface MessagingVerificationCodesVerifyResponse {
  code: 0;
  data: unknown & { item: MessagingVerificationCodeVerifyResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
