export interface MessagingOutboundMessageSendRequest {
  channel: 'sms' | 'email';
  target: string;
  subject?: string;
  body: string;
  payload?: Record<string, unknown>;
  scenario?: string;
  templateCode?: string;
  provider?: string;
}
