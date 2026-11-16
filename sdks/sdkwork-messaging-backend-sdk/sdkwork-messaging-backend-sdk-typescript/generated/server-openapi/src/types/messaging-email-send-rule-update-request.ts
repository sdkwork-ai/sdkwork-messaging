import type { MessagingEmailSendRuleStepUpdate } from './messaging-email-send-rule-step-update';

export interface MessagingEmailSendRuleUpdateRequest {
  steps: MessagingEmailSendRuleStepUpdate[];
  enabled: boolean;
  expectedVersion: string;
}
