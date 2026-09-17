export interface MessagingAnnouncement {
    id: string;
    title: string;
    body: string;
    severity?: 'info' | 'success' | 'warning' | 'critical';
    status: 'draft' | 'scheduled' | 'published' | 'expired' | 'cancelled';
    requireAck?: boolean;
    publishAt?: string;
    expireAt?: string;
    acknowledgedAt?: string;
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=messaging-announcement.d.ts.map