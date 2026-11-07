import type {
  MessagingNotification,
  MessagingNotificationListResponse,
  NotificationCenterService,
} from "@sdkwork/messaging-pc-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "./NotificationCenter.tsx";

const notifications: MessagingNotification[] = [
  {
    id: "deployment-ready",
    title: "Production deployment completed",
    body: "Application portal-api is healthy in all regions.",
    category: "deployment",
    priority: "high",
    status: "unread",
    actionUrl: "/console/deployments/portal-api",
    metadata: { application: "portal-api", region: "cn-east-1" },
    createdAt: "2026-07-28T08:00:00.000Z",
  },
  {
    id: "security-review",
    title: "Security review completed",
    body: "No high-risk findings were detected.",
    category: "security",
    priority: "normal",
    status: "read",
    createdAt: "2026-07-27T08:00:00.000Z",
    readAt: "2026-07-27T09:00:00.000Z",
  },
];

describe("NotificationCenter", () => {
  it("loads one server page and marks the selected notification as read", async () => {
    const service = createService(pageResponse(notifications));
    render(<NotificationCenter access={{ status: "authenticated", service }} locale="en-US" />);

    expect(screen.getByText("Synchronizing business messages...")).toBeInTheDocument();
    expect(await screen.findByText("Production deployment completed")).toBeInTheDocument();
    expect(service.listNotifications).toHaveBeenCalledWith({ page: 1, pageSize: 20 });

    fireEvent.click(await screen.findByRole("button", { name: "Mark as handled" }));
    await waitFor(() => expect(service.markRead).toHaveBeenCalledWith("deployment-ready"));
    expect(await screen.findByText("0 need action on this page")).toBeInTheDocument();
  });

  it("filters only the current server page without constructing local pagination", async () => {
    const service = createService(pageResponse(notifications));
    render(<NotificationCenter access={{ status: "authenticated", service }} locale="en-US" />);
    await screen.findByText("Production deployment completed");

    fireEvent.click(screen.getByRole("button", { name: "Security & compliance" }));
    expect(screen.queryByText("Production deployment completed")).not.toBeInTheDocument();
    expect(screen.getAllByText("Security review completed")).toHaveLength(2);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search business messages on the current page" }), {
      target: { value: "no-match" },
    });
    expect(screen.getByText("No matching business messages")).toBeInTheDocument();
  });

  it("uses server page metadata for next-page navigation", async () => {
    const listNotifications = vi.fn()
      .mockResolvedValueOnce(pageResponse(notifications, { page: 1, totalPages: 2, totalItems: "21" }))
      .mockResolvedValueOnce(pageResponse([], { page: 2, totalPages: 2, totalItems: "21" }));
    const service = createService(pageResponse(notifications), listNotifications);
    render(<NotificationCenter access={{ status: "authenticated", service }} locale="en-US" />);
    await screen.findByText("Page 1 of 2");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(listNotifications).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }));
  });

  it.each([
    [{ status: 403 }, "Your current role cannot view this message stream"],
    [new TypeError("network unavailable"), "Message service cannot connect right now"],
    [new Error("unknown"), "Messages could not be synchronized"],
  ])("renders commercial error recovery for %s", async (error, expectedTitle) => {
    const service = createService(pageResponse([]), vi.fn().mockRejectedValue(error));
    render(<NotificationCenter access={{ status: "authenticated", service }} locale="en-US" />);
    expect(await screen.findByText(expectedTitle)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeInTheDocument();
  });

  it("renders a public guest state without requiring a notification service", () => {
    render(
      <NotificationCenter
        access={{ status: "anonymous", signInHref: "/auth/login?redirect=%2Fnotifications" }}
        locale="en-US"
      />,
    );

    expect(screen.getAllByText("Public workspace available")).toHaveLength(2);
    expect(screen.getByText("Personal messages")).toBeInTheDocument();
    expect(screen.getByText("Not requested")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in and connect private messages" })).toHaveAttribute(
      "href",
      "/auth/login?redirect=%2Fnotifications",
    );
  });
});

function createService(
  response: MessagingNotificationListResponse,
  listNotifications = vi.fn().mockResolvedValue(response),
): NotificationCenterService {
  return {
    listNotifications,
    markRead: vi.fn().mockResolvedValue({ notificationId: "deployment-ready", status: "read", readAt: "2026-07-28T08:01:00.000Z" }),
  };
}

function pageResponse(
  items: MessagingNotification[],
  pageInfo: Partial<MessagingNotificationListResponse["pageInfo"]> = {},
): MessagingNotificationListResponse {
  return {
    items,
    pageInfo: { mode: "offset", page: 1, pageSize: 20, totalItems: String(items.length), totalPages: 1, ...pageInfo },
  };
}
