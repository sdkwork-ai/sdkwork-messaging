export interface MessagingVerificationPolicy {
  id: string;
  sceneCode: string;
  channel: 'sms' | 'email';
  ttlSeconds: number;
  maxAttempts: number;
  messageSubject?: string;
  messageBodyPattern?: string;
  enabled: boolean;
  version: string;
}
