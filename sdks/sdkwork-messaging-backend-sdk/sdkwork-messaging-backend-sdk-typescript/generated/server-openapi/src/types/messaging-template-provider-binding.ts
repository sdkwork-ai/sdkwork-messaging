export interface MessagingTemplateProviderBinding {
  provider: string;
  providerTemplateId?: string;
  providerTemplateName?: string;
  syncStatus: 'not_synced' | 'pending_approval' | 'synced' | 'failed';
  syncMessage?: string;
  lastSyncedAt?: string;
  version: string;
}
