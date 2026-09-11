export interface MessagingVerificationCodeVerifyResponse {
  verified: boolean;
  status: 'pending' | 'verified' | 'failed' | 'locked' | 'expired';
  remainingAttempts?: number;
}
