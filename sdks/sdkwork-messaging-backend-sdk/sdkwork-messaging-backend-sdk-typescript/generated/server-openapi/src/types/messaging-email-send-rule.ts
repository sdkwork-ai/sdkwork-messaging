import type { MessagingEmailSendRuleStep } from './messaging-email-send-rule-step';

export interface MessagingEmailSendRule {
  scenario: 'default' | 'verification_code' | 'system_notification' | 'marketing';
  chain: MessagingEmailSendRuleStep[];
  enabled: boolean;
  updatedAt?: string;
  version: string;
}
