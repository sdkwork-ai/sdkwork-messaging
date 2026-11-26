export interface MessagingSmsSignatureUpdateRequest {
  signName: string;
  enabled: boolean;
  providerAccountId?: string | null;
  expectedVersion: string;
}
