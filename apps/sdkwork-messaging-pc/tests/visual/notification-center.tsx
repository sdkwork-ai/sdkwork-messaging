import type {
  MessagingNotification,
  MessagingNotificationListResponse,
  NotificationCenterService,
} from "@sdkwork/messaging-pc-core";
import { MessagingPcShell } from "@sdkwork/messaging-pc-shell";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "../../src/index.css";

const firstPage: MessagingNotification[] = [
  {
    id: "production-deployment",
    title: "Production deployment completed",
    body: "The customer portal is healthy in all regions. The signed artifact, health checks, and rollback point are available for review.",
    category: "deployment",
    priority: "high",
    status: "unread",
    actionUrl: "https://sdkwork.com/console/deployments/customer-portal",
    metadata: {
      application: "customer-portal",
      environment: "cloud.production",
      region: "cn-east-1",
      version: "2.8.0",
    },
    createdAt: "2026-07-28T08:30:00.000Z",
  },
  {
    id: "security-review",
    title: "Security review completed",
    body: "No high-risk findings were detected. Certificate rotation and dependency policy checks completed successfully.",
    category: "security",
    priority: "normal",
    status: "unread",
    metadata: { policy: "commercial-release", findings: 0, traceId: "01K1QA-SEC-2208" },
    createdAt: "2026-07-28T07:10:00.000Z",
  },
  {
    id: "invoice-ready",
    title: "July cloud service invoice is ready",
    body: "Your consolidated cloud service invoice is available with deployment, bandwidth, and certificate usage details.",
    category: "billing",
    priority: "normal",
    status: "read",
    metadata: { billingPeriod: "2026-07", currency: "CNY", invoiceNumber: "SDK-202607-0188" },
    createdAt: "2026-07-27T10:00:00.000Z",
    readAt: "2026-07-27T10:16:00.000Z",
  },
  {
    id: "maintenance-window",
    title: "Edge maintenance window scheduled",
    body: "A rolling edge maintenance window is scheduled. Traffic will remain available through regional failover.",
    category: "system",
    priority: "low",
    status: "read",
    metadata: { window: "2026-07-30 02:00-03:00 CST", impact: "No expected downtime" },
    createdAt: "2026-07-26T04:20:00.000Z",
    readAt: "2026-07-26T06:00:00.000Z",
  },
];

const secondPage: MessagingNotification[] = [
  {
    id: "staging-release",
    title: "Staging release is ready for approval",
    body: "Release evidence is complete and the deployment plan is waiting for an authorized approver.",
    category: "release",
    priority: "normal",
    status: "unread",
    metadata: { application: "partner-api", environment: "cloud.staging" },
    createdAt: "2026-07-25T06:45:00.000Z",
  },
];

let currentFirstPage = firstPage;

const service: NotificationCenterService = {
  async listNotifications(query): Promise<MessagingNotificationListResponse> {
    const items = query.page === 1 ? currentFirstPage : secondPage;
    return {
      items,
      pageInfo: { mode: "offset", page: query.page, pageSize: query.pageSize, totalItems: "41", totalPages: 3 },
      };
  },
  async markRead(notificationId) {
    const readAt = new Date().toISOString();
    currentFirstPage = currentFirstPage.map((item) => item.id === notificationId
      ? { ...item, status: "read", readAt }
      : item);
    return { notificationId, status: "read" };
  },
};

const root = document.getElementById("root");
if (!root) throw new Error("visual fixture root is required");

createRoot(root).render(
  <SdkworkThemeProvider className="messaging-theme" defaultTheme="light" locale="en-US" themeColor="green-tech">
    <MemoryRouter initialEntries={["/notifications"]}>
      <MessagingPcShell
        locale="en-US"
        session={{
          status: "authenticated",
          onSignOut: () => undefined,
          service,
          userLabel: "Alex Morgan",
        }}
      />
    </MemoryRouter>
  </SdkworkThemeProvider>,
);
