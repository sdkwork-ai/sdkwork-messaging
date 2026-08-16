import { describe, expect, it } from "vitest";

import { createMessagingRuntime } from "../src/index";

describe("SDKWork messaging runtime", () => {
  it("requires generated SDK-shaped app and backend clients", () => {
    const runtime = createMessagingRuntime({
      clients: {
        app: {
          messaging: {
            notifications: { list: async () => ({}), markRead: async () => ({}) },
            announcements: { list: async () => ({}), acknowledge: async () => ({}) },
            pushDevices: { register: async () => ({}), unregister: async () => ({}) },
            verificationCodes: { create: async () => ({}), verify: async () => ({}) },
          },
        },
        backend: {
          messaging: {
            notifications: { list: async () => ({}), create: async () => ({}) },
            announcements: { list: async () => ({}), publish: async () => ({}) },
            pushMessages: { list: async () => ({}), send: async () => ({}) },
            outboundMessages: { list: async () => ({}), send: async () => ({}) },
            verificationPolicies: { list: async () => ({}), update: async () => ({}) },
            channels: { retrieve: async () => ({}), update: async () => ({}) },
            templates: {
              list: async () => ({}),
              create: async () => ({}),
              retrieve: async () => ({}),
              update: async () => ({}),
              delete: async () => ({}),
            },
          } as any,
        },
      },
      config: {
        appId: "default",
        enabledCapabilities: ["notifications", "announcements", "appPush", "sms", "email", "verificationCodes"],
        environment: "test",
      },
    });

    expect(runtime.config.enabledCapabilities).toEqual(["notifications", "announcements", "appPush", "sms", "email", "verificationCodes"]);
    expect(runtime.service).toHaveProperty("admin");
  });
});
