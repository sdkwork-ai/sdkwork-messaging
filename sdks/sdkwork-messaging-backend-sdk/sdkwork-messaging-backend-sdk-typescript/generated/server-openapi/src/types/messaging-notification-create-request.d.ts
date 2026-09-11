export interface MessagingNotificationCreateRequest {
    recipientUserIds: string[];
    title: string;
    body: string;
    category?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=messaging-notification-create-request.d.ts.map