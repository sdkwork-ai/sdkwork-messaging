import type { MessagingSmsSendRuleStep } from './messaging-sms-send-rule-step';

export interface MessagingSmsSendRule {
  scenario: 'default' | 'verification_code' | 'system_notification' | 'marketing';
  chain: MessagingSmsSendRuleStep[];
  enabled: boolean;
  updatedAt?: string;
  version: string;
}
