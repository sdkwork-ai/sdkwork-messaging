import type { MessagingChannelResponse } from './messaging-channel-response';
export interface MessagingChannelsUpdateResponse {
    code: 0;
    data: unknown & {
        item: MessagingChannelResponse;
    };
    /** Server-owned request correlation id. */
    traceId: string;
}
//# sourceMappingURL=messaging-channels-update-response.d.ts.map