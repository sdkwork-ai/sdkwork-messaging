import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown> | string) => {
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
    },
  }),
}));

import { ProviderInitializeDialog } from "./components/provider-initialize-dialog.tsx";
import type { ProviderDirectoryEntry } from "./components/ProviderDirectory.tsx";

const ENTRIES: ProviderDirectoryEntry[] = [
  {
    provider: "enterprise_mail",
    label: "企业邮箱",
    description: "Tencent Exmail",
    account: { name: "Enterprise Mail", enabled: true, hasSecret: true },
  },
  {
    provider: "gmail",
    label: "Gmail",
    description: "Google Gmail",
  },
];

describe("ProviderInitializeDialog", () => {
  it("renders a labelled modal dialog", () => {
    const html = renderToStaticMarkup(
      createElement(ProviderInitializeDialog, {
        catalogKeyPrefix: "admin.notify.emailProviders",
        entries: ENTRIES,
        onInitialize: () => undefined,
        onConfigure: () => undefined,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("admin.notify.providers.initializeTitle");
  });

  it("offers initialize for missing providers and configure for existing ones", () => {
    const html = renderToStaticMarkup(
      createElement(ProviderInitializeDialog, {
        catalogKeyPrefix: "admin.notify.emailProviders",
        entries: ENTRIES,
        onInitialize: () => undefined,
        onConfigure: () => undefined,
        onInitializeAll: () => undefined,
        onClose: () => undefined,
      }),
    );
    // The initialized provider exposes "configure"; the missing one "initialize".
    expect(html).toContain("admin.notify.providers.configure");
    expect(html).toContain("admin.notify.providers.initialize<");
    // One provider is missing, so the bulk action is offered.
    expect(html).toContain("admin.notify.providers.initializeAll");
  });

  it("hides the bulk action when every provider is already initialized", () => {
    const html = renderToStaticMarkup(
      createElement(ProviderInitializeDialog, {
        catalogKeyPrefix: "admin.notify.emailProviders",
        entries: [ENTRIES[0]],
        onInitialize: () => undefined,
        onConfigure: () => undefined,
        onInitializeAll: () => undefined,
        onClose: () => undefined,
      }),
    );
    expect(html).not.toContain("admin.notify.providers.initializeAll");
    expect(html).toContain("admin.notify.providers.initializeFooter");
  });
});
