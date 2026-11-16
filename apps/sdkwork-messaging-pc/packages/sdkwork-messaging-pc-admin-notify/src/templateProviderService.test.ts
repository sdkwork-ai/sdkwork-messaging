import { beforeEach, describe, expect, it, vi } from "vitest";

const { listProviders, syncProviders, updateProvider, createTemplate } = vi.hoisted(() => ({
  listProviders: vi.fn(async (_templateId: string) => ({
    items: [{ provider: "tencent", syncStatus: "synced", version: "1" }],
    pageInfo: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1, hasMore: false },
  })),
  syncProviders: vi.fn(
    async (
      _templateId: string,
      _body: { providers?: string[]; overwrite?: boolean },
      _params: { idempotencyKey: string },
    ) => ({
      synced: 1,
      pendingApproval: 0,
      items: [{ provider: "tencent", syncStatus: "synced", version: "1" }],
    }),
  ),
  updateProvider: vi.fn(
    async (
      _templateId: string,
      _provider: string,
      _body: { providerTemplateId?: string; syncStatus?: string },
      _params: { idempotencyKey: string },
    ) => ({
      provider: "tencent",
      providerTemplateId: "123",
      syncStatus: "synced",
      version: "2",
    }),
  ),
  createTemplate: vi.fn(async (_body: unknown, _params: { idempotencyKey: string }) => ({
    id: "42",
    channel: "sms",
    templateCode: "order_paid",
    name: "Order paid",
    content: "content",
    approvalStatus: "pending",
    status: "active",
    version: "0",
  })),
}));

vi.mock("./sdk-client.ts", () => ({
  messagingBackendSdkClient: () => ({
    messaging: {
      templateProviders: {
        list: listProviders,
        sync: syncProviders,
        update: updateProvider,
      },
      templates: {
        create: createTemplate,
      },
    },
  }),
}));

import { createNotifyAdminService } from "./notifyAdminService.ts";

describe("template provider bindings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists provider bindings", async () => {
    const items = await createNotifyAdminService().listTemplateProviders("42");
    expect(listProviders).toHaveBeenCalledWith("42");
    expect(items[0].provider).toBe("tencent");
  });

  it("syncs all providers with a fresh idempotency key", async () => {
    const result = await createNotifyAdminService().syncTemplateProviders("42");
    expect(syncProviders).toHaveBeenCalledTimes(1);
    const [templateId, body, params] = syncProviders.mock.calls[0] as [
      string,
      { providers?: string[] },
      { idempotencyKey: string },
    ];
    expect(templateId).toBe("42");
    expect(body.providers).toBeUndefined();
    expect(params.idempotencyKey.length).toBeGreaterThanOrEqual(8);
    expect(result.synced).toBe(1);
  });

  it("records a provider-specific template id", async () => {
    const binding = await createNotifyAdminService().updateTemplateProvider("42", "tencent", {
      providerTemplateId: "123",
      syncStatus: "synced",
    });
    const [templateId, provider, body, params] = updateProvider.mock.calls[0] as [
      string,
      string,
      { providerTemplateId?: string },
      { idempotencyKey: string },
    ];
    expect(templateId).toBe("42");
    expect(provider).toBe("tencent");
    expect(body.providerTemplateId).toBe("123");
    expect(params.idempotencyKey.length).toBeGreaterThanOrEqual(8);
    expect(binding.providerTemplateId).toBe("123");
  });

  it("returns the SDK-unwrapped template item after create", async () => {
    const template = await createNotifyAdminService().createTemplate({
      channel: "sms",
      templateCode: "order_paid",
      name: "Order paid",
      content: "content",
    });
    expect(template.id).toBe("42");
    expect(template.templateCode).toBe("order_paid");
  });
});
