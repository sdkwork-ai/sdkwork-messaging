export interface MessagingProviderInitializeResponse {
  accepted: boolean;
  resourceId?: string;
  status?: 'created' | 'initialized';
  identityId?: string;
  rulesEnsured?: number;
}
