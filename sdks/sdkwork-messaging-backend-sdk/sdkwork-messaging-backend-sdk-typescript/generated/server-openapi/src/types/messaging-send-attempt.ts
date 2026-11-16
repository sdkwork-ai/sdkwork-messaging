export interface MessagingSendAttempt {
  id: string;
  provider?: string;
  providerMessageId?: string;
  status: 'accepted' | 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'cancelled' | 'expired';
  errorCode?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  createdAt: string;
}
