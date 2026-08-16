export interface MessagingTemplateUpdateRequest {
  name: string;
  subject?: string;
  content: string;
  variables?: string[];
  approvalStatus?: 'not_applicable' | 'pending' | 'approved' | 'rejected';
  approvalNote?: string;
  status?: 'draft' | 'active' | 'disabled';
}
