// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MessagingDashboardSummary } from "../notifyAdminService";

vi.mock("react-i18next", () => {
  // `t` and `i18n` must keep their identity across renders: the page derives its
  // loader from `t`, so a fresh function per render would re-trigger the effect.
  const t = (key: string, options?: Record<string, unknown> | string) => {
    if (typeof options === "string") {
      return options;
    }
    let text = key;
    if (options) {
      for (const [name, value] of Object.entries(options)) {
        text = text.replaceAll(`{{${name}}}`, String(value));
      }
    }
    return text;
  };
  const i18n = { language: "en" };
  return { useTranslation: () => ({ t, i18n }) };
});

import { NotificationDashboardPage } from "./NotificationDashboardPage.tsx";
import type { NotifyAdminService } from "../notifyAdminService";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function trendFor(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const email = 100 + index;
    const sms = 40 + index;
    return {
      date: `2026-11-${String(index + 1).padStart(2, "0")}`,
      email,
      sms,
      delivered: email + sms - 5,
      failed: 5,
    };
  });
}

function summaryFor(rangeDays: number): MessagingDashboardSummary {
  const trend = trendFor(rangeDays);
  const email = trend.reduce((sum, point) => sum + point.email, 0);
  const sms = trend.reduce((sum, point) => sum + point.sms, 0);
  const failed = trend.reduce((sum, point) => sum + point.failed, 0);
  return {
    rangeDays,
    from: trend[0]?.date ?? "2026-11-01",
    to: trend.at(-1)?.date ?? "2026-11-30",
    totals: {
      total: email + sms,
      email,
      sms,
      delivered: email + sms - failed,
      failed,
      pending: 0,
      successRate: (email + sms - failed) / (email + sms),
    },
    byChannel: [
      { channel: "email", total: email, delivered: email - 3, failed: 3, pending: 0 },
      { channel: "sms", total: sms, delivered: sms - 2, failed: 2, pending: 0 },
    ],
    byStatus: [
      { status: "delivered", count: email + sms - failed },
      { status: "failed", count: failed },
    ],
    byScenario: [
      { scenario: "order_paid", channel: "email", total: 120, failed: 4 },
      { scenario: "login_verify_code", channel: "sms", total: 80, failed: 1 },
    ],
    byProvider: [{ provider: "aliyun_sms", channel: "sms", total: 200, failed: 5 }],
    trend,
    recentFailures: [
      {
        id: "1",
        channel: "email",
        scenario: "order_paid",
        targetMasked: "o***@example.com",
        provider: "aliyun_direct_mail",
        status: "failed",
        errorCode: "InvalidRcpt",
        errorMessage: "rejected by provider",
        bodyPreview: "",
        createdAt: "2026-11-27T09:41:12Z",
      } as MessagingDashboardSummary["recentFailures"][number],
    ],
  };
}

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  host.remove();
  document.body.innerHTML = "";
});

function render(service: NotifyAdminService) {
  return act(async () => {
    root.render(createElement(NotificationDashboardPage, { service }));
  });
}

function serviceReturning(summary: MessagingDashboardSummary) {
  const getNotificationDashboard = vi.fn(async () => summary);
  return {
    service: { getNotificationDashboard } as unknown as NotifyAdminService,
    getNotificationDashboard,
  };
}

describe("notification overview render", () => {
  it("fills the KPI strip, trend, and distributions from one summary", async () => {
    const { service, getNotificationDashboard } = serviceReturning(summaryFor(30));
    await render(service);

    expect(getNotificationDashboard).toHaveBeenCalledWith(30);
    expect(host.querySelectorAll("[data-notify-kpi]")).toHaveLength(6);
    // One bar per day, each carrying its own tooltip.
    expect(host.querySelectorAll('section[aria-label="admin.notify.dashboard.trendTitle"] [title]'))
      .toHaveLength(30);
    // Both distribution tables render their rows (2 scenarios + 1 provider).
    expect(host.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(host.textContent).toContain("aliyun_sms");
    expect(host.textContent).toContain("InvalidRcpt");
  });

  it("never nests a scroll container inside the daily-trend card", async () => {
    // Regression: the chart used `overflow-x-auto` with rotated date labels,
    // which produced a vertical scrollbar inside the card and clipped the axis.
    const { service } = serviceReturning(summaryFor(30));
    await render(service);

    const trend = host.querySelector('section[aria-label="admin.notify.dashboard.trendTitle"]');
    expect(trend).not.toBeNull();
    const scrollers = Array.from(trend!.querySelectorAll<HTMLElement>("*")).filter((node) => {
      const className = node.className;
      return typeof className === "string" && /overflow-(?:x|y)-(?:auto|scroll)/u.test(className);
    });
    expect(scrollers).toEqual([]);
  });

  it("reloads the summary when the reporting range changes", async () => {
    const { service, getNotificationDashboard } = serviceReturning(summaryFor(7));
    await render(service);

    const sevenDays = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "admin.notify.dashboard.range.7",
    );
    expect(sevenDays).toBeDefined();
    await act(async () => {
      sevenDays!.click();
    });

    expect(getNotificationDashboard).toHaveBeenLastCalledWith(7);
    expect(host.querySelectorAll('section[aria-label="admin.notify.dashboard.trendTitle"] [title]'))
      .toHaveLength(7);
  });

  it("shows explicit empty states instead of zeroed charts", async () => {
    const empty = summaryFor(30);
    empty.trend = empty.trend.map((point) => ({
      ...point,
      email: 0,
      sms: 0,
      delivered: 0,
      failed: 0,
    }));
    empty.totals = { total: 0, email: 0, sms: 0, delivered: 0, failed: 0, pending: 0, successRate: 0 };
    empty.byChannel = [
      { channel: "email", total: 0, delivered: 0, failed: 0, pending: 0 },
      { channel: "sms", total: 0, delivered: 0, failed: 0, pending: 0 },
    ];
    empty.byStatus = [];
    empty.byScenario = [];
    empty.byProvider = [];
    empty.recentFailures = [];

    const { service } = serviceReturning(empty);
    await render(service);

    const trend = host.querySelector('section[aria-label="admin.notify.dashboard.trendTitle"]');
    expect(trend?.textContent).toContain("admin.notify.dashboard.empty");
    expect(trend?.textContent).toContain("—");
    expect(host.textContent).toContain("admin.notify.dashboard.noFailures");
    expect(host.textContent).not.toContain("NaN");
  });
});
