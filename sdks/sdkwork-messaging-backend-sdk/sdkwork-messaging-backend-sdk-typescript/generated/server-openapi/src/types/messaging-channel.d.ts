export interface MessagingChannel {
    id: string;
    channel: 'sms' | 'email';
    provider: 'smtp' | 'aliyun' | 'tencent' | 'generic_http';
    config?: Record<string, unknown>;
    hasSecret: boolean;
    keyDisplayMasked?: string;
    enabled: boolean;
    createdAt?: string;
    updatedAt?: string;
}
//# sourceMappingURL=messaging-channel.d.ts.map