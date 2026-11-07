export interface MessagingSmsAccount {
  id: string;
  name: string;
  provider: 'aliyun' | 'tencent' | 'huawei' | 'yuntongxun' | 'submail' | 'chuanglan' | 'twilio' | 'generic_http';
  config?: Record<string, unknown>;
  hasSecret: boolean;
  keyDisplayMasked?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  version: string;
}
