export interface MessagingEmailAccount {
  id: string;
  name: string;
  provider: 'smtp' | 'aliyun' | 'tencent' | 'sendgrid' | 'mailgun' | 'amazon_ses' | 'postmark' | 'resend';
  config?: Record<string, unknown>;
  hasSecret: boolean;
  keyDisplayMasked?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  version: string;
}
