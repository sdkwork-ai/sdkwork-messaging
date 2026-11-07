export interface MessagingEmailSendRuleUpdateRequest {
  senderIds: string[];
  enabled: boolean;
  expectedVersion: string;
}
