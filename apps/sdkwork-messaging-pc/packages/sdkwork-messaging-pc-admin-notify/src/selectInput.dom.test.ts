// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Field, SelectInput } from "./components/form.tsx";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

/**
 * Regression cover for "the signature dropdown cannot be used".
 *
 * Two separate defects made a select look dead:
 *   1. `Field` wrapped its control in a `<label>`, so the first click on the
 *      label area only focused the select instead of opening the option list;
 *   2. a disabled select loses the native arrow, leaving no affordance and no
 *      explanation.
 *
 * These assertions pin the fixed behaviour: the label no longer wraps the
 * control, the control exposes a real option list, and a disabled select states
 * why it is locked.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const OPTIONS = [
  { value: "a", label: "Account A" },
  { value: "b", label: "Account B" },
];

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  host.remove();
  document.body.innerHTML = "";
});

function renderSelect(props: Parameters<typeof SelectInput>[0], hint?: string) {
  return act(async () => {
    root.render(
      createElement(Field, {
        label: "Provider account",
        ...(hint !== undefined ? { hint } : {}),
        children: createElement(SelectInput, props),
      }),
    );
  });
}

describe("Field does not swallow select clicks", () => {
  it("renders the control outside a wrapping <label>", async () => {
    await renderSelect({ value: "a", onChange: vi.fn(), options: OPTIONS });
    const select = document.querySelector("select")!;
    expect(select).not.toBeNull();
    // The old markup put the select inside <label>; that is what broke the
    // first click. The group must be a plain container now.
    expect(select.closest("label")).toBeNull();
    expect(select.parentElement?.tagName).toBe("DIV");
  });

  it("exposes a real option list and reports selection changes", async () => {
    const onChange = vi.fn();
    await renderSelect({ value: "a", onChange, options: OPTIONS });
    const select = document.querySelector("select")!;
    expect([...select.options].map((option) => option.value)).toEqual(["a", "b"]);

    // Simulate picking the second option the way a browser would.
    select.value = "b";
    await act(async () => {
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("shows a chevron so the control reads as a dropdown", async () => {
    await renderSelect({ value: "a", onChange: vi.fn(), options: OPTIONS });
    const chevron = document.querySelector("svg.lucide-chevron-down");
    expect(chevron).not.toBeNull();
    // The chevron must not intercept the click aimed at the select.
    expect(chevron!.getAttribute("class")).toContain("pointer-events-none");
  });

  it("explains why a locked select cannot be used", async () => {
    await renderSelect(
      { value: "a", onChange: vi.fn(), options: OPTIONS, disabled: true, disabledHint: "Locked after creation" },
    );
    const select = document.querySelector<HTMLSelectElement>("select")!;
    expect(select.disabled).toBe(true);
    expect(host.textContent).toContain("Locked after creation");
  });

  it("is interactive when not disabled", async () => {
    await renderSelect({ value: "a", onChange: vi.fn(), options: OPTIONS });
    const select = document.querySelector<HTMLSelectElement>("select")!;
    expect(select.disabled).toBe(false);
    expect(select.className).toContain("cursor-pointer");
  });
});
