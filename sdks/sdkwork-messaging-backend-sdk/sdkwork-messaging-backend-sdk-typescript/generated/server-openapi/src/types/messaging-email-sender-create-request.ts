export interface MessagingEmailSenderCreateRequest {
  accountId: string;
  fromAddress: string;
  fromName?: string;
  enabled: boolean;
}
