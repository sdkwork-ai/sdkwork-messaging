// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OverlayPortal } from "./components/overlay-portal.tsx";
import { SlideOver } from "./components/slide-over.tsx";

/**
 * Regression cover for the reported bug: the "add provider" drawer header was
 * covered and the close button unreachable.
 *
 * Root cause: the channel page scrolls inside an `overflow-y-auto` container,
 * which becomes the containing block for positioned descendants. A plain
 * `fixed` overlay was therefore clipped to that scroll area and could be covered
 * by sibling panels (the provider directory). Overlays now portal to <body>.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  // Mirror the real page: a scrolling ancestor that clips fixed children.
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

describe("SlideOver portals out of the scrolling container", () => {
  it("mounts the dialog under <body>, not inside the scroll container", async () => {
    await act(async () => {
      root.render(createElement(SlideOver, { title: "添加服务商", onClose: vi.fn(), children: "c" }));
    });
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    // Not nested in the clipped/scrolling host ...
    expect(host.contains(dialog)).toBe(false);
    // ... it lives directly on <body>.
    expect(dialog?.parentElement?.parentElement).toBe(document.body);
  });

  it("keeps the header and close button reachable", async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(createElement(SlideOver, { title: "添加服务商", onClose, children: "c" }));
    });
    const heading = document.querySelector('[role="dialog"] h2');
    expect(heading?.textContent).toBe("添加服务商");
    const close = document.querySelector<HTMLButtonElement>('button[aria-label="close"]');
    expect(close).not.toBeNull();
    await act(async () => {
      close!.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("places the overlay on a viewport layer above page chrome", async () => {
    await act(async () => {
      root.render(createElement(SlideOver, { title: "T", onClose: vi.fn(), children: "c" }));
    });
    const overlay = document.querySelector('[role="dialog"]')?.parentElement;
    expect(overlay?.className).toContain("fixed");
    expect(overlay?.className).toContain("inset-0");
    // Tailwind z-[100] beats the page's own z-index utilities.
    expect(overlay?.className).toMatch(/z-\[100\]/u);
  });

  it("closes on Escape and on a scrim press", async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(createElement(SlideOver, { title: "T", onClose, children: "c" }));
    });
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = document.querySelector('[role="dialog"]')?.parentElement as HTMLElement;
    await act(async () => {
      overlay.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does not close when the panel itself is pressed", async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(createElement(SlideOver, { title: "T", onClose, children: "c" }));
    });
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    await act(async () => {
      dialog.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("OverlayPortal", () => {
  it("locks background scrolling while open and restores it on close", async () => {
    document.body.style.overflow = "auto";
    await act(async () => {
      root.render(createElement(OverlayPortal, { children: "x" }));
    });
    expect(document.body.style.overflow).toBe("hidden");
    await act(async () => {
      root.render(createElement("div", { children: "closed" }));
    });
    expect(document.body.style.overflow).toBe("auto");
  });
});
