export interface MessagingTemplateProviderUpdateRequest {
  providerTemplateId?: string;
  providerTemplateName?: string;
  syncStatus?: 'not_synced' | 'pending_approval' | 'synced' | 'failed';
}
