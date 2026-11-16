export interface MessagingDashboardProvider {
  provider: string;
  channel: 'sms' | 'email';
  total: number;
  failed: number;
}
