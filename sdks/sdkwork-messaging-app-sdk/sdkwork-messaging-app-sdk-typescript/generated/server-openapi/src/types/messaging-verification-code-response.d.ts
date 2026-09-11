export interface MessagingVerificationCodeResponse {
    codeId: string;
    expiresAt: string;
    status?: 'pending' | 'verified' | 'failed' | 'locked' | 'expired';
    /** Server-owned request correlation id. */
    requestId: string;
}
//# sourceMappingURL=messaging-verification-code-response.d.ts.map