export interface MessagingSmsSignatureCreateRequest {
  accountId: string;
  signName: string;
  enabled: boolean;
  providerAccountId?: string | null;
}
