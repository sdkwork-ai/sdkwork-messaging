import { beforeEach, describe, expect, it, vi } from "vitest";

const { initializeEmailProvider, initializeSmsProvider } = vi.hoisted(() => ({
  initializeEmailProvider: vi.fn(
    async (_provider: string, _params: { idempotencyKey: string }) => ({ accepted: true }),
  ),
  initializeSmsProvider: vi.fn(
    async (_provider: string, _params: { idempotencyKey: string }) => ({ accepted: true }),
  ),
}));

vi.mock("./sdk-client.ts", () => ({
  messagingBackendSdkClient: () => ({
    messaging: {
      emailProviders: { initialize: initializeEmailProvider },
      smsProviders: { initialize: initializeSmsProvider },
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
});
