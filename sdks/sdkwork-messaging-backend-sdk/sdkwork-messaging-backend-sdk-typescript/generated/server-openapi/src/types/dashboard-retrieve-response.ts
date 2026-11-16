import type { MessagingDashboardSummary } from './messaging-dashboard-summary';

export interface DashboardRetrieveResponse {
  code: 0;
  data: unknown & { item: MessagingDashboardSummary; };
  /** Server-owned request correlation id. */
  traceId: string;
}
