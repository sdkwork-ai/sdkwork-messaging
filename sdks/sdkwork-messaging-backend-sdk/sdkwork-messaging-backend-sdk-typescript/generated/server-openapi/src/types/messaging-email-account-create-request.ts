export interface MessagingEmailAccountCreateRequest {
  name: string;
  provider: 'smtp' | 'aliyun' | 'tencent' | 'sendgrid' | 'mailgun' | 'amazon_ses' | 'postmark' | 'resend';
  config: Record<string, unknown>;
  secret?: string;
  enabled: boolean;
}
