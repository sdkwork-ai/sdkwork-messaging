export interface MessagingEmailAccountUpdateRequest {
  name: string;
  provider: 'smtp' | 'enterprise_mail' | 'aliyun' | 'tencent' | 'tencent_mail' | 'mail_139' | 'gmail' | 'microsoft' | 'sendgrid' | 'mailgun' | 'amazon_ses' | 'postmark' | 'resend';
  config: Record<string, unknown>;
  secret?: string;
  enabled: boolean;
  receiveEnabled?: boolean;
  expectedVersion: string;
}
