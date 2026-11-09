import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChannelTabs, type ChannelTabItem } from "./channel-tabs.tsx";

type TabId = "accounts" | "rules";

const ITEMS: readonly ChannelTabItem<TabId>[] = [
  { id: "accounts", label: "Accounts" },
  { id: "rules", label: "Rules" },
];

const MARKUP = renderToStaticMarkup(
  createElement(ChannelTabs, {
    ariaLabel: "Channel tabs",
    activeId: "accounts" as TabId,
    onChange: () => undefined,
    items: ITEMS,
  }),
);

describe("channel tabs", () => {
  it("renders one tablist shared by the email and SMS channel pages", () => {
    expect(MARKUP).toContain('role="tablist"');
    expect(MARKUP).toContain('aria-label="Channel tabs"');
    expect(MARKUP.match(/role="tab"/gu)).toHaveLength(ITEMS.length);
  });

  it("draws the selected tab as a tinted primary pill, not a solid accent block", () => {
    expect(MARKUP).toContain('aria-selected="true"');
    expect(MARKUP).toContain("bg-sky-500/10");
    expect(MARKUP).toContain("text-sky-700");
    expect(MARKUP).toContain("ring-sky-500/25");
    // The previous per-channel solid fills must not come back: both channel
    // pages have to show exactly the same selected effect.
    expect(MARKUP).not.toContain("bg-sky-600");
    expect(MARKUP).not.toContain("bg-emerald-600");
    expect(MARKUP).not.toContain("text-white");
  });

  it("keeps a roving tab stop so keyboard users reach the selected tab first", () => {
    expect(MARKUP).toContain('tabindex="0"');
    expect(MARKUP).toContain('tabindex="-1"');
  });

  it("is the only tab bar rendered by both channel pages", () => {
    for (const relativePage of [
      "../pages/EmailChannelPage.tsx",
      "../pages/SmsChannelPage.tsx",
    ]) {
      const source = readFileSync(new URL(relativePage, import.meta.url), "utf8");
      expect(source, `${relativePage} must render the shared tab bar`).toContain("<ChannelTabs");
      expect(source, `${relativePage} must not hand-roll its own tablist`).not.toContain(
        'role="tablist"',
      );
    }
  });
});
