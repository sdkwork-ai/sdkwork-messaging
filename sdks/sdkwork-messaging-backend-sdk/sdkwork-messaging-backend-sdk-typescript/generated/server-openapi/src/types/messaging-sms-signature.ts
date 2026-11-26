export interface MessagingSmsSignature {
  id: string;
  accountId: string;
  accountName: string;
  signName: string;
  enabled: boolean;
  providerAccountId: string | null;
  providerAccountReady: boolean;
  createdAt?: string;
  updatedAt?: string;
  version: string;
}
