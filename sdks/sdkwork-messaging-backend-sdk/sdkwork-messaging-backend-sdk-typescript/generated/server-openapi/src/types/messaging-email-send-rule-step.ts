export interface MessagingEmailSendRuleStep {
  senderId: string;
  accountId: string;
  accountName: string;
  fromAddress: string;
  fromName?: string;
  enabled?: boolean;
}
