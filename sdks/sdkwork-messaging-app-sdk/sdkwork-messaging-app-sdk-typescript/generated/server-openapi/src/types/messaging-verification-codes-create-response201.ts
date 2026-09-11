import type { MessagingVerificationCodeResponse } from './messaging-verification-code-response';

export interface MessagingVerificationCodesCreateResponse201 {
  code: 0;
  data: unknown & { item: MessagingVerificationCodeResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
