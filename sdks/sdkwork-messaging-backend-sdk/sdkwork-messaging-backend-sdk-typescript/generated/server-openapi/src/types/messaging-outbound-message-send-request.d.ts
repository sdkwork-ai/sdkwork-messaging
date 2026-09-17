export interface MessagingOutboundMessageSendRequest {
    channel: 'sms' | 'email';
    target: string;
    subject?: string;
    body: string;
    payload?: Record<string, unknown>;
}
//# sourceMappingURL=messaging-outbound-message-send-request.d.ts.map