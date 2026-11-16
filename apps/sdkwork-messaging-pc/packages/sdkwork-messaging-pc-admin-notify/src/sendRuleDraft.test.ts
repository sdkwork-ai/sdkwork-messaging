import { describe, expect, it } from "vitest";

import {
  addDraftStep,
  createRuleDraft,
  isDraftDirty,
  markDraftSaved,
  moveDraftStep,
  removeDraftStep,
  reorderDraftToPriority,
  resetDraftToSaved,
  setDraftEnabled,
  toggleDraftStep,
  toStepPayload,
  validateDraft,
} from "./sendRuleDraft.ts";

function draft() {
  return createRuleDraft({
    enabled: true,
    steps: [
      { id: "1", identityEnabled: true, stepEnabled: true },
      { id: "2", identityEnabled: false, stepEnabled: true },
    ],
    version: "3",
    updatedAt: "2026-11-16T10:00:00Z",
  });
}

describe("send rule draft", () => {
  it("tracks unsaved changes and resets to the saved baseline", () => {
    const initial = draft();
    expect(isDraftDirty(initial)).toBe(false);

    const toggled = toggleDraftStep(initial, "1", false);
    expect(isDraftDirty(toggled)).toBe(true);
    const reset = resetDraftToSaved(toggled);
    expect(isDraftDirty(reset)).toBe(false);
    expect(reset.steps[0].stepEnabled).toBe(true);
  });

  it("moves, removes and adds steps without mutating the previous draft", () => {
    const initial = draft();
    const moved = moveDraftStep(initial, 0, 1);
    expect(moved.steps.map((step) => step.id)).toEqual(["2", "1"]);
    expect(initial.steps.map((step) => step.id)).toEqual(["1", "2"]);

    const removed = removeDraftStep(initial, "1");
    expect(removed.steps.map((step) => step.id)).toEqual(["2"]);

    const added = addDraftStep(initial, "3", false);
    expect(added.steps.map((step) => step.id)).toEqual(["1", "2", "3"]);
    expect(added.steps[2].stepEnabled).toBe(true);
    expect(added.steps[2].identityEnabled).toBe(false);
    // Adding an existing step is a no-op.
    expect(addDraftStep(initial, "1", true)).toBe(initial);
  });

  it("reorders to the recommended priority while preserving enablement", () => {
    const initial = toggleDraftStep(draft(), "2", false);
    const reordered = reorderDraftToPriority(initial, ["2", "1"]);
    expect(reordered.steps.map((step) => step.id)).toEqual(["2", "1"]);
    expect(reordered.steps[0].stepEnabled).toBe(false);
    expect(reordered.steps[1].stepEnabled).toBe(true);
  });

  it("rejects an enabled rule without an active step", () => {
    const disabledStep = toggleDraftStep(toggleDraftStep(draft(), "1", false), "2", false);
    expect(validateDraft(disabledStep)).toBe("no-enabled-step");
    const disabledRule = setDraftEnabled(disabledStep, false);
    expect(validateDraft(disabledRule)).toBeNull();
  });

  it("rejects an enabled rule with an empty chain and duplicate ids", () => {
    const empty = createRuleDraft({
      enabled: true,
      steps: [],
      version: "0",
      updatedAt: null,
    });
    expect(validateDraft(empty)).toBe("empty-chain");
    const duplicate = createRuleDraft({
      enabled: true,
      steps: [
        { id: "1", identityEnabled: true, stepEnabled: true },
        { id: "1", identityEnabled: true, stepEnabled: true },
      ],
      version: "0",
      updatedAt: null,
    });
    expect(validateDraft(duplicate)).toBe("duplicate-step");
  });

  it("produces the wire payload and marks a save as clean", () => {
    const initial = toggleDraftStep(draft(), "2", false);
    expect(toStepPayload(initial)).toEqual([
      { id: "1", enabled: true },
      { id: "2", enabled: false },
    ]);
    const saved = markDraftSaved(initial);
    expect(isDraftDirty(saved)).toBe(false);
  });
});
