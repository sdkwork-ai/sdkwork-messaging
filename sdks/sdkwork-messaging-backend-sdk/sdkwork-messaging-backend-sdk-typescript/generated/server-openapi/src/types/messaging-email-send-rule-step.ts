export interface MessagingEmailSendRuleStep {
  senderId: string;
  accountId: string;
  accountName: string;
  fromAddress: string;
  fromName?: string;
  identityEnabled: boolean;
  accountEnabled: boolean;
  hasSecret: boolean;
  stepEnabled: boolean;
  providerAccountId: string | null;
  credentialsReady: boolean;
}
