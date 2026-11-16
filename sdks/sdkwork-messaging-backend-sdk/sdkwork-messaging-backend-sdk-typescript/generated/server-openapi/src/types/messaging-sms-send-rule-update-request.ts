import type { MessagingSmsSendRuleStepUpdate } from './messaging-sms-send-rule-step-update';

export interface MessagingSmsSendRuleUpdateRequest {
  steps: MessagingSmsSendRuleStepUpdate[];
  enabled: boolean;
  expectedVersion: string;
}
