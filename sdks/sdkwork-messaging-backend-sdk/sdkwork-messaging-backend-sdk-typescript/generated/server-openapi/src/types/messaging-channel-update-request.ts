export interface MessagingChannelUpdateRequest {
  provider: 'smtp' | 'aliyun' | 'tencent' | 'generic_http';
  config: Record<string, unknown>;
  secret?: string;
  enabled: boolean;
}
