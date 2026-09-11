import type { MessagingAudience } from './messaging-audience';
export interface MessagingAnnouncementPublishRequest {
    title: string;
    body: string;
    severity?: 'info' | 'success' | 'warning' | 'critical';
    requireAck?: boolean;
    publishAt?: string;
    expireAt?: string;
    audiences: MessagingAudience[];
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=messaging-announcement-publish-request.d.ts.map