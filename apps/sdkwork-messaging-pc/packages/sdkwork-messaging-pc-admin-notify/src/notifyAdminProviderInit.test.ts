import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  initializeEmailProvider,
  initializeSmsProvider,
  listEmailSendRecords,
  listSmsSendRecords,
  retrieveEmailSendRecord,
  dashboardRetrieve,
} = vi.hoisted(() => ({
  initializeEmailProvider: vi.fn(
    async (_provider: string, _params: { idempotencyKey: string }) => ({ accepted: true }),
  ),
  initializeSmsProvider: vi.fn(
    async (_provider: string, _params: { idempotencyKey: string }) => ({ accepted: true }),
  ),
  listEmailSendRecords: vi.fn(async (_params: unknown) => ({
    items: [],
    pageInfo: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasMore: false },
  })),
  listSmsSendRecords: vi.fn(async (_params: unknown) => ({
    items: [],
    pageInfo: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasMore: false },
  })),
  retrieveEmailSendRecord: vi.fn(async (_recordId: string) => ({ id: "1" })),
  dashboardRetrieve: vi.fn(async (_params: unknown) => ({ rangeDays: 30 })),
}));

vi.mock("./sdk-client.ts", () => ({
  messagingBackendSdkClient: () => ({
    messaging: {
      emailProviders: { initialize: initializeEmailProvider },
      smsProviders: { initialize: initializeSmsProvider },
      emailSendRecords: {
        list: listEmailSendRecords,
        retrieve: retrieveEmailSendRecord,
      },
      smsSendRecords: {
        list: listSmsSendRecords,
        retrieve: vi.fn(async (_recordId: string) => ({ id: "2" })),
      },
      dashboard: { retrieve: dashboardRetrieve },
    },
  }),
}));

import { createNotifyAdminService } from "./notifyAdminService.ts";

describe("notify admin provider initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes email provider initialization through the generated SDK command", async () => {
    const service = createNotifyAdminService();
    await service.initializeEmailProvider("enterprise_mail");

    expect(initializeEmailProvider).toHaveBeenCalledTimes(1);
    const [provider, params] = initializeEmailProvider.mock.calls[0] as [
      string,
      { idempotencyKey: string },
    ];
    expect(provider).toBe("enterprise_mail");
    expect(params.idempotencyKey.length).toBeGreaterThanOrEqual(8);
    expect(initializeSmsProvider).not.toHaveBeenCalled();
  });

  it("routes sms provider initialization through the generated SDK command", async () => {
    const service = createNotifyAdminService();
    await service.initializeSmsProvider("tencent");

    expect(initializeSmsProvider).toHaveBeenCalledTimes(1);
    const [provider, params] = initializeSmsProvider.mock.calls[0] as [
      string,
      { idempotencyKey: string },
    ];
    expect(provider).toBe("tencent");
    expect(params.idempotencyKey.length).toBeGreaterThanOrEqual(8);
  });

  it("uses a fresh idempotency key for every initialization command", async () => {
    const service = createNotifyAdminService();
    await service.initializeEmailProvider("enterprise_mail");
    await service.initializeEmailProvider("enterprise_mail");

    const first = (initializeEmailProvider.mock.calls[0] as [string, { idempotencyKey: string }])[1];
    const second = (initializeEmailProvider.mock.calls[1] as [string, { idempotencyKey: string }])[1];
    expect(first.idempotencyKey).not.toBe(second.idempotencyKey);
  });

  it("maps send-record filters to the generated query parameter names", async () => {
    const service = createNotifyAdminService();
    const page = await service.listEmailSendRecords({
      status: "delivered",
      q: "verify",
      from: "2026-11-01",
      to: "2026-11-16",
      page: 2,
      pageSize: 20,
    });
    expect(page.totalItems).toBe(0);
    expect(listEmailSendRecords).toHaveBeenCalledWith({
      status: "delivered",
      q: "verify",
      from_: "2026-11-01",
      to: "2026-11-16",
      page: 2,
      pageSize: 20,
    });

    await service.listSmsSendRecords({ status: "failed" });
    expect(listSmsSendRecords).toHaveBeenCalledWith({
      status: "failed",
      q: undefined,
      from_: undefined,
      to: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it("retrieves a send record and the notification dashboard through the SDK", async () => {
    const service = createNotifyAdminService();
    const record = await service.retrieveEmailSendRecord("42");
    expect(record.id).toBe("1");
    expect(retrieveEmailSendRecord).toHaveBeenCalledWith("42");

    const summary = await service.getNotificationDashboard(7);
    expect(summary.rangeDays).toBe(30);
    expect(dashboardRetrieve).toHaveBeenCalledWith({ range: 7 });
  });
});
