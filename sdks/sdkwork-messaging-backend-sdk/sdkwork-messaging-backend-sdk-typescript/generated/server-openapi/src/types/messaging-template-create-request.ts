export interface MessagingTemplateCreateRequest {
  channel: 'sms' | 'email';
  templateCode: string;
  name: string;
  subject?: string;
  content: string;
  variables?: string[];
  approvalStatus?: 'not_applicable' | 'pending' | 'approved' | 'rejected';
  approvalNote?: string;
  status?: 'draft' | 'active' | 'disabled';
}
