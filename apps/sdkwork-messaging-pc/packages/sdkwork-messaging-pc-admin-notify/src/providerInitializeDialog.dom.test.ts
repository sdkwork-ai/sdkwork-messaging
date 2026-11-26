// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      let text = key;
      if (options) {
        for (const [name, value] of Object.entries(options)) {
          text = text.replaceAll(`{{${name}}}`, String(value));
        }
      }
      return text;
    },
  }),
}));

import { ProviderInitializeDialog } from "./components/provider-initialize-dialog.tsx";
import type { ProviderDirectoryEntry } from "./components/ProviderDirectory.tsx";

/**
 * The provider directory used to sit permanently above the account table. Once
 * accounts exist that list is redundant — the table shows them and "新增服务商"
 * already enumerates every provider — so initialization moved into this dialog,
 * opened from an explicit "初始化服务商" button.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const INITIALIZED: ProviderDirectoryEntry = {
  provider: "enterprise_mail",
  label: "企业邮箱",
  description: "Tencent Exmail",
  account: { name: "Enterprise Mail", enabled: true, hasSecret: false },
};
const MISSING: ProviderDirectoryEntry = {
  provider: "gmail",
  label: "Gmail",
  description: "Google Gmail",
};

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  host = document.createElement("div");
  host.className = "overflow-y-auto";
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  host.remove();
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

function render(props: Parameters<typeof ProviderInitializeDialog>[0]) {
  return act(async () => {
    root.render(createElement(ProviderInitializeDialog, props));
  });
}

describe("ProviderInitializeDialog", () => {
  it("portals to <body> so the scrolling page cannot clip it", async () => {
    await render({
      catalogKeyPrefix: "admin.notify.emailProviders",
      entries: [INITIALIZED, MISSING],
      onInitialize: vi.fn(),
      onConfigure: vi.fn(),
      onClose: vi.fn(),
    });
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(host.contains(dialog)).toBe(false);
  });

  it("lists every provider with its state", async () => {
    await render({
      catalogKeyPrefix: "admin.notify.emailProviders",
      entries: [INITIALIZED, MISSING],
      onInitialize: vi.fn(),
      onConfigure: vi.fn(),
      onClose: vi.fn(),
    });
    const text = document.body.textContent ?? "";
    expect(text).toContain("企业邮箱");
    expect(text).toContain("Gmail");
    expect(text).toContain("admin.notify.providers.initialized");
    expect(text).toContain("admin.notify.providers.missing");
    // Half-configured providers must be visible, not silently "ready".
    expect(text).toContain("admin.notify.providers.credentialsMissing");
  });

  it("initializes a missing provider and configures an existing one", async () => {
    const onInitialize = vi.fn();
    const onConfigure = vi.fn();
    await render({
      catalogKeyPrefix: "admin.notify.emailProviders",
      entries: [INITIALIZED, MISSING],
      onInitialize,
      onConfigure,
      onClose: vi.fn(),
    });

    const buttons = [...document.querySelectorAll("button")];
    const initButton = buttons.find((b) => b.textContent?.includes("admin.notify.providers.initialize") && !b.textContent.includes("All"));
    const configButton = buttons.find((b) => b.textContent?.includes("admin.notify.providers.configure"));
    expect(initButton).toBeDefined();
    expect(configButton).toBeDefined();

    await act(async () => {
      initButton!.click();
    });
    expect(onInitialize).toHaveBeenCalledWith("gmail");

    await act(async () => {
      configButton!.click();
    });
    expect(onConfigure).toHaveBeenCalledWith("enterprise_mail");
  });

  it("closes on Escape and via the close button", async () => {
    const onClose = vi.fn();
    await render({
      catalogKeyPrefix: "admin.notify.emailProviders",
      entries: [MISSING],
      onInitialize: vi.fn(),
      onConfigure: vi.fn(),
      onClose,
    });
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    const closeButton = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("admin.notify.common.close"),
    );
    expect(closeButton).toBeDefined();
    await act(async () => {
      closeButton!.click();
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
