//! Shared segmented tab bar for the messaging channel pages.
//!
//! The email and SMS channel surfaces must render exactly the same tab
//! geometry and the same selected state; keeping one component is what makes
//! that guarantee structural instead of a copy-pasted convention. Selected
//! tabs use the package primary accent as a tinted pill (light background,
//! primary text, inset ring) instead of a solid block, matching the admin
//! segmented-control treatment used elsewhere.

import type { KeyboardEvent } from "react";

export interface ChannelTabItem<TId extends string> {
  readonly id: TId;
  readonly label: string;
}

export interface ChannelTabsProps<TId extends string> {
  readonly items: readonly ChannelTabItem<TId>[];
  readonly activeId: TId;
  readonly onChange: (id: TId) => void;
  /** Accessible name of the tab list, e.g. "Email channel configuration tabs". */
  readonly ariaLabel: string;
}

const SELECTED_CLASS =
  "bg-sky-500/10 text-sky-700 ring-1 ring-inset ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/25";
const IDLE_CLASS =
  "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5";

export function ChannelTabs<TId extends string>({
  items,
  activeId,
  onChange,
  ariaLabel,
}: ChannelTabsProps<TId>) {
  const selectAt = (index: number, tablist: HTMLElement) => {
    const item = items[index];
    if (!item) {
      return;
    }
    onChange(item.id);
    tablist
      .querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .item(index)
      ?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === activeId);
    if (index < 0) {
      return;
    }
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = (index + 1) % items.length;
        break;
      case "ArrowLeft":
        next = (index - 1 + items.length) % items.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectAt(next, event.currentTarget);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className="flex w-full min-w-0 gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-[#1a1a1a]"
    >
      {items.map((item) => {
        const selected = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#1a1a1a] ${
              selected ? SELECTED_CLASS : IDLE_CLASS
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
