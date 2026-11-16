import type { MessagingSendAttempt } from './messaging-send-attempt';

export interface MessagingSendRecord {
  id: string;
  channel: 'sms' | 'email';
  targetMasked: string;
  subject?: string;
  body?: string;
  bodyText?: string;
  bodyPreview: string;
  status: 'accepted' | 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'cancelled' | 'expired';
  scenario: string;
  templateCode?: string;
  provider?: string;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  attemptCount: number;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  attempts?: MessagingSendAttempt[];
}
