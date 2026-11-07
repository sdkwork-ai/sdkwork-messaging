import { describe, expect, it } from "vitest";

import {
  APP_MESSAGING_METHOD_TREE,
  BACKEND_MESSAGING_METHOD_TREE,
  assertMessagingAppSdkClient,
} from "../src/index";

describe("SDKWork messaging SDK ports", () => {
  it("keeps app, SMS, email, and verification operations behind generated SDK ports", () => {
    expect(APP_MESSAGING_METHOD_TREE).toHaveProperty("notifications");
    expect(APP_MESSAGING_METHOD_TREE).toHaveProperty("announcements");
    expect(APP_MESSAGING_METHOD_TREE).toHaveProperty("pushDevices");
    expect(APP_MESSAGING_METHOD_TREE).toHaveProperty("verificationCodes");
    expect(BACKEND_MESSAGING_METHOD_TREE).toHaveProperty("notifications");
    expect(BACKEND_MESSAGING_METHOD_TREE).toHaveProperty("announcements");
    expect(BACKEND_MESSAGING_METHOD_TREE).toHaveProperty("pushMessages");
    expect(BACKEND_MESSAGING_METHOD_TREE).toHaveProperty("outboundMessages");
    expect(BACKEND_MESSAGING_METHOD_TREE).toHaveProperty("verificationPolicies");

    const treeText = JSON.stringify({ APP_MESSAGING_METHOD_TREE, BACKEND_MESSAGING_METHOD_TREE });
    expect(treeText).not.toMatch(/provider|sender|messageTemplate|routeRule|suppression|rateLimit|dialogueThread|realtime/iu);
  });

  it("requires the generated messaging app SDK surface", () => {
    expect(() =>
      assertMessagingAppSdkClient({
        messaging: {
          notifications: { list: async () => ({}), markRead: async () => ({}) },
          announcements: { list: async () => ({}), acknowledge: async () => ({}) },
          pushDevices: { register: async () => ({}), unregister: async () => ({}) },
          verificationCodes: { create: async () => ({}), verify: async () => ({}) },
        },
      }),
    ).not.toThrow();

    expect(() =>
      assertMessagingAppSdkClient({
        messaging: {
          notifications: { list: async () => ({}) },
        },
      }),
    ).toThrow(/messaging notification, announcement, app push, and verification methods/);
  });
});
