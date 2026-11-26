export interface MessagingEmailAccount {
  id: string;
  name: string;
  provider: 'smtp' | 'enterprise_mail' | 'tencent_exmail' | 'aliyun_mail' | 'netease_qiye' | 'mail_263' | 'coremail' | 'lark_mail' | 'exchange_online' | 'exchange_cn' | 'sohu_mail' | 'huawei_mail' | 'sina_mail' | 'google_workspace' | 'aliyun' | 'tencent' | 'tencent_mail' | 'mail_139' | 'gmail' | 'microsoft' | 'sendgrid' | 'mailgun' | 'amazon_ses' | 'postmark' | 'resend';
  config?: Record<string, unknown>;
  hasSecret: boolean;
  keyDisplayMasked?: string;
  enabled: boolean;
  receiveEnabled: boolean;
  providerAccountId: string | null;
  providerAccountReady: boolean;
  createdAt?: string;
  updatedAt?: string;
  version: string;
}
