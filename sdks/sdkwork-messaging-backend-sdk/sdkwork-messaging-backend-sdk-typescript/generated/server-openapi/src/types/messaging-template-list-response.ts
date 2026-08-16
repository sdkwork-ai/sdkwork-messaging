import type { MessagingTemplate } from './messaging-template';
import type { PageInfo } from './page-info';

export interface MessagingTemplateListResponse {
  items: MessagingTemplate[];
  pageInfo: PageInfo;
}
