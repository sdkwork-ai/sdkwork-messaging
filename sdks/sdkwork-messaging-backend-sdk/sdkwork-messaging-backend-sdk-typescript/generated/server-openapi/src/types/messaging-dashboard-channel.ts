export interface MessagingDashboardChannel {
  channel: 'sms' | 'email';
  total: number;
  delivered: number;
  failed: number;
  pending: number;
}
