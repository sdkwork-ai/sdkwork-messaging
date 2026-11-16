import { describe, expect, it } from "vitest";

import {
  MESSAGING_ADMIN_DEFAULT_PATH,
  MESSAGING_ADMIN_MENU,
  MESSAGING_ADMIN_MODULE_DEF,
  MESSAGING_ADMIN_PERMISSION_HINTS,
  MESSAGING_ADMIN_ROUTE_RECORDS,
} from "./contribution.ts";

describe("messaging admin contribution", () => {
  it("keeps the module default path mounted and pointing at the overview", () => {
    expect(MESSAGING_ADMIN_MODULE_DEF.defaultPath).toBe(MESSAGING_ADMIN_DEFAULT_PATH);
    const defaultRecord = MESSAGING_ADMIN_ROUTE_RECORDS.find(
      (record) => record.path === "notify",
    );
    expect(defaultRecord?.redirectTo).toBe(MESSAGING_ADMIN_DEFAULT_PATH);
    const overview = MESSAGING_ADMIN_ROUTE_RECORDS.find(
      (record) => record.path === "notify/overview",
    );
    expect(overview?.screen).toBe("overview");
  });

  it("mounts every menu item and exposes a permission hint for it", () => {
    const menuPaths = MESSAGING_ADMIN_MENU.groups.flatMap((group) =>
      group.items.map((item) => item.path.replace(/^\/admin\//, "")),
    );
    expect(menuPaths.length).toBeGreaterThan(0);
    for (const path of menuPaths) {
      expect(
        MESSAGING_ADMIN_ROUTE_RECORDS.some((record) => record.path === path),
        `menu path ${path} must have a route record`,
      ).toBe(true);
      expect(
        MESSAGING_ADMIN_PERMISSION_HINTS.some(
          (hint) => hint.pathPrefix === `/admin/${path}`,
        ),
        `menu path ${path} must have a permission hint`,
      ).toBe(true);
    }
  });

  it("keeps route paths and screens unique", () => {
    const paths = MESSAGING_ADMIN_ROUTE_RECORDS.map((record) => record.path);
    expect(new Set(paths).size).toBe(paths.length);
    const screens = MESSAGING_ADMIN_ROUTE_RECORDS.map((record) => record.screen);
    // The redirect and the overview page intentionally share one screen.
    expect(new Set(screens).size).toBe(screens.length - 1);
    for (const screen of screens) {
      expect(
        ["overview", "email-channel", "sms-channel", "email-records", "sms-records", "email-templates", "sms-templates"],
      ).toContain(screen);
    }
  });
});
