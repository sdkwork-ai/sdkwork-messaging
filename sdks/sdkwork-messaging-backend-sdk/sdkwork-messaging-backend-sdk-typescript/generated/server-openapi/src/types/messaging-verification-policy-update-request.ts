export interface MessagingVerificationPolicyUpdateRequest {
  ttlSeconds?: number;
  maxAttempts?: number;
  messageSubject?: string;
  messageBodyPattern: string;
  enabled?: boolean;
  expectedVersion: string;
}
