export interface MessagingSmsSendRuleStep {
  signatureId: string;
  accountId: string;
  accountName: string;
  signName: string;
  identityEnabled: boolean;
  accountEnabled: boolean;
  hasSecret: boolean;
  stepEnabled: boolean;
  providerAccountId: string | null;
  credentialsReady: boolean;
}
