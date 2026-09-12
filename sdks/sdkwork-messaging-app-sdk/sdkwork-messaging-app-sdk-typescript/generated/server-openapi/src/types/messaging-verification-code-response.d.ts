export interface MessagingVerificationCodeResponse {
    codeId: string;
    expiresAt: string;
    status?: 'pending' | 'verified' | 'failed' | 'locked' | 'expired';
}
//# sourceMappingURL=messaging-verification-code-response.d.ts.map