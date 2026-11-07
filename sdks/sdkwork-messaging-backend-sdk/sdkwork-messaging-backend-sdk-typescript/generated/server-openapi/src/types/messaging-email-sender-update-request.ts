export interface MessagingEmailSenderUpdateRequest {
  fromAddress: string;
  fromName?: string;
  enabled: boolean;
  expectedVersion: string;
}
