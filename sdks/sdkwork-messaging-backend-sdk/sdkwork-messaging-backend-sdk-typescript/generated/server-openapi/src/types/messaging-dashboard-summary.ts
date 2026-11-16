import type { MessagingDashboardChannel } from './messaging-dashboard-channel';
import type { MessagingDashboardProvider } from './messaging-dashboard-provider';
import type { MessagingDashboardScenario } from './messaging-dashboard-scenario';
import type { MessagingDashboardStatus } from './messaging-dashboard-status';
import type { MessagingDashboardTotals } from './messaging-dashboard-totals';
import type { MessagingDashboardTrendPoint } from './messaging-dashboard-trend-point';
import type { MessagingSendRecord } from './messaging-send-record';

export interface MessagingDashboardSummary {
  rangeDays: number;
  from: string;
  to: string;
  totals: MessagingDashboardTotals;
  byChannel: MessagingDashboardChannel[];
  byStatus: MessagingDashboardStatus[];
  byScenario: MessagingDashboardScenario[];
  byProvider: MessagingDashboardProvider[];
  trend: MessagingDashboardTrendPoint[];
  recentFailures: MessagingSendRecord[];
}
