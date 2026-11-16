export interface MessagingDashboardScenario {
  scenario: string;
  channel: 'sms' | 'email';
  total: number;
  failed: number;
}
