import type { MessagingTemplateProviderBinding } from './messaging-template-provider-binding';
import type { PageInfo } from './page-info';

export interface MessagingTemplateProviderListResponse {
  items: MessagingTemplateProviderBinding[];
  pageInfo: PageInfo;
}
