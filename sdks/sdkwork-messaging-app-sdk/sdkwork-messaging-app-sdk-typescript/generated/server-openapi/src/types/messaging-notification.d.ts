export interface MessagingNotification {
    id: string;
    title: string;
    body: string;
    category?: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'unread' | 'read' | 'archived';
    actionUrl?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    readAt?: string;
}
//# sourceMappingURL=messaging-notification.d.ts.map