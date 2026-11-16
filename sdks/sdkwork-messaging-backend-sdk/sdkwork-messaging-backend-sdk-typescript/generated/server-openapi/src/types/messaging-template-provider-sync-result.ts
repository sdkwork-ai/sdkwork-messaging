import type { MessagingTemplateProviderBinding } from './messaging-template-provider-binding';

export interface MessagingTemplateProviderSyncResult {
  synced: number;
  pendingApproval: number;
  items: MessagingTemplateProviderBinding[];
}
