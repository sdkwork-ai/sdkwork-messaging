import type { SdkworkAppClient } from "@sdkwork/messaging-app-sdk";
import { describe, expect, it, vi } from "vitest";
import { createNotificationCenterService } from "./notification-center-service.ts";

describe("createNotificationCenterService", () => {
  it("passes one bounded server page through the generated SDK", async () => {
    const response = {
      items: [],
      pageInfo: { page: 2, pageSize: 20, totalItems: 31, totalPages: 2 },
      requestId: "request-1",
    };
    const list = vi.fn().mockResolvedValue(response);
    const read = vi.fn();
    const service = createNotificationCenterService(createClient(list, read));

    await expect(service.listNotifications({ page: 2, pageSize: 20 })).resolves.toBe(response);
    expect(list).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
  });

  it("creates the idempotency key inside the service adapter", async () => {
    const list = vi.fn();
    const receipt = { notificationId: "notification-1", status: "read", readAt: "2026-07-28T08:00:00.000Z" };
    const read = vi.fn().mockResolvedValue(receipt);
    const service = createNotificationCenterService(createClient(list, read), {
      createIdempotencyKey: () => "idempotency-1",
    });

    await expect(service.markRead(" notification-1 ")).resolves.toBe(receipt);
    expect(read).toHaveBeenCalledWith("notification-1", { idempotencyKey: "idempotency-1" });
  });

  it("rejects invalid pagination before reaching the SDK", () => {
    const list = vi.fn();
    const service = createNotificationCenterService(createClient(list, vi.fn()));
    expect(() => service.listNotifications({ page: 1, pageSize: 201 })).toThrow(/must not exceed 200/);
    expect(list).not.toHaveBeenCalled();
  });
});

function createClient(list: ReturnType<typeof vi.fn>, read: ReturnType<typeof vi.fn>) {
  return {
    messaging: { notifications: { list, read } },
  } as unknown as Pick<SdkworkAppClient, "messaging">;
}

