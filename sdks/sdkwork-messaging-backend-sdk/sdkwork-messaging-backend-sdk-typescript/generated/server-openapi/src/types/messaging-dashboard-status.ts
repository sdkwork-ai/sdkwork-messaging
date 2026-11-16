export interface MessagingDashboardStatus {
  status: 'accepted' | 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'cancelled' | 'expired';
  count: number;
}
