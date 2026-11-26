export interface MessagingSmsAccountUpdateRequest {
  name: string;
  provider: 'aliyun' | 'tencent' | 'huawei' | 'yuntongxun' | 'submail' | 'chuanglan' | 'twilio' | 'generic_http';
  config: Record<string, unknown>;
  secret?: string;
  enabled: boolean;
  providerAccountId?: string | null;
  expectedVersion: string;
}
