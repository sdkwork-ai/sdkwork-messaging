export interface MessagingVerificationCodeVerifyResponse {
    verified: boolean;
    status: 'pending' | 'verified' | 'failed' | 'locked' | 'expired';
    remainingAttempts?: number;
}
//# sourceMappingURL=messaging-verification-code-verify-response.d.ts.map