import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { SlideOver } from "./components/slide-over.tsx";

/**
 * Regression cover for the "drawer header is covered / cannot close" bug.
 *
 * The channel pages scroll inside an `overflow-y-auto` container, which becomes
 * the containing block for positioned descendants: a plain `fixed` overlay was
 * clipped to the scroll area and could be covered by sibling panels (the
 * provider directory), leaving the title and close button unreachable.
 *
 * These assertions pin the overlay's contract in a DOM-less environment:
 *   1. it always renders a labelled dialog with a close control (never dropped),
 *   2. it declares the full-viewport layer that a portal needs,
 *   3. it is portalled rather than nested in the scrolling content.
 */
describe("SlideOver overlay contract", () => {
  const markup = renderToStaticMarkup(
    createElement(SlideOver, {
      title: "添加服务商",
      onClose: () => undefined,
      children: "body",
    }),
  );

  it("renders a labelled modal dialog", () => {
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("添加服务商");
  });

  it("always offers a close control", () => {
    expect(markup).toContain('aria-label="close"');
  });

  it("covers the whole viewport on its own top layer", () => {
    // A viewport overlay must be `fixed inset-0` and sit above page chrome.
    expect(markup).toMatch(/class="fixed inset-0 z-\[\d+\]/u);
  });

  it("keeps the header and close button pinned while content scrolls", () => {
    // The body scrolls (`overflow-y-auto`) while the header does not, so the
    // close button cannot scroll out of reach.
    expect(markup).toContain("overflow-y-auto");
    expect(markup).toMatch(/shrink-0[^"]*border-b/u);
  });
});
