export interface MessagingEmailSender {
  id: string;
  accountId: string;
  accountName: string;
  fromAddress: string;
  fromName?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  version: string;
}
