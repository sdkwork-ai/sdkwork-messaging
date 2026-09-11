export interface MessagingPushMessage {
    id: string;
    title: string;
    body: string;
    status: 'accepted' | 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'cancelled' | 'expired';
    badge?: number;
    collapseKey?: string;
    data?: Record<string, string>;
    scheduledAt?: string;
    createdAt?: string;
}
//# sourceMappingURL=messaging-push-message.d.ts.map