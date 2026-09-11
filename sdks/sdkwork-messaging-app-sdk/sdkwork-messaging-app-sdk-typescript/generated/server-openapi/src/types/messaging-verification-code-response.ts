export interface MessagingVerificationCodeResponse {
  codeId: string;
  expiresAt: string;
  status?: 'pending' | 'verified' | 'failed' | 'locked' | 'expired';
}
