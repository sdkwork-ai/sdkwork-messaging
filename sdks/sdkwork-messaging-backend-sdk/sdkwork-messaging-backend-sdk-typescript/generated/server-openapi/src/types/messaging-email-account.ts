export interface MessagingEmailAccount {
  id: string;
  name: string;
  provider: 'smtp' | 'enterprise_mail' | 'aliyun' | 'tencent' | 'tencent_mail' | 'mail_139' | 'gmail' | 'microsoft' | 'sendgrid' | 'mailgun' | 'amazon_ses' | 'postmark' | 'resend';
  config?: Record<string, unknown>;
  hasSecret: boolean;
  keyDisplayMasked?: string;
  enabled: boolean;
  receiveEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  version: string;
}
