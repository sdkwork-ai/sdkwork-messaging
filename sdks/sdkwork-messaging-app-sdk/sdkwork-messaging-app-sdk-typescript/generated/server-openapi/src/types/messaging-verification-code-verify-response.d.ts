export interface MessagingVerificationCodeVerifyResponse {
    verified: boolean;
    status: 'pending' | 'verified' | 'failed' | 'locked' | 'expired';
    remainingAttempts?: number;
    /** Server-owned request correlation id. */
    requestId: string;
}
//# sourceMappingURL=messaging-verification-code-verify-response.d.ts.map