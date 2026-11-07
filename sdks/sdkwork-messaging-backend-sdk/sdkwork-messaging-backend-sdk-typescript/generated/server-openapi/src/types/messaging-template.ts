export interface MessagingTemplate {
  id: string;
  channel: 'sms' | 'email';
  templateCode: string;
  name: string;
  subject?: string;
  content: string;
  variables?: string[];
  approvalStatus: 'not_applicable' | 'pending' | 'approved' | 'rejected';
  approvalNote?: string;
  status: 'draft' | 'active' | 'disabled';
  version: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}
