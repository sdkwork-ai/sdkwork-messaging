export interface MessagingPushMessageSendRequest {
    recipientUserIds: string[];
    title: string;
    body: string;
    badge?: number;
    collapseKey?: string;
    data?: Record<string, string>;
    scheduledAt?: string;
}
//# sourceMappingURL=messaging-push-message-send-request.d.ts.map