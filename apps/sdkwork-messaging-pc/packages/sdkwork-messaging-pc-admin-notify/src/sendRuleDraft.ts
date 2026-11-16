/**
 * Pure draft model for the notification send-routing rules.
 *
 * A rule is an ordered fallback chain. Each step has two independent switches:
 * - `identityEnabled` — the sender/signature identity and its provider account
 *   are enabled (owned by the channel account tabs);
 * - `stepEnabled` — this step participates in the scenario chain (owned here).
 *
 * The draft keeps the last saved signature so the UI can show unsaved changes
 * and disable a no-op save. All operations are immutable and side-effect free,
 * which keeps the two channel panels on one tested implementation.
 */

export interface SendRuleStepDraft {
  id: string;
  identityEnabled: boolean;
  accountEnabled: boolean;
  hasSecret: boolean;
  stepEnabled: boolean;
}

export interface SendRuleDraft {
  enabled: boolean;
  steps: SendRuleStepDraft[];
  version: string;
  updatedAt: string | null;
  /** Stable serialization of the last saved state. */
  savedSignature: string;
}

export type SendRuleValidationError =
  | "duplicate-step"
  | "no-enabled-step"
  | "empty-chain";

export function createRuleDraft(input: {
  enabled: boolean;
  steps: {
    id: string;
    identityEnabled: boolean;
    accountEnabled?: boolean;
    hasSecret?: boolean;
    stepEnabled: boolean;
  }[];
  version: string;
  updatedAt: string | null;
}): SendRuleDraft {
  const steps = input.steps.map((step) => ({
    id: step.id,
    identityEnabled: step.identityEnabled,
    accountEnabled: step.accountEnabled ?? true,
    hasSecret: step.hasSecret ?? false,
    stepEnabled: step.stepEnabled,
  }));
  return {
    enabled: input.enabled,
    steps,
    version: input.version,
    updatedAt: input.updatedAt,
    savedSignature: draftSignature(input.enabled, steps),
  };
}

function draftSignature(enabled: boolean, steps: readonly SendRuleStepDraft[]): string {
  return JSON.stringify({
    enabled,
    steps: steps.map((step) => ({ id: step.id, enabled: step.stepEnabled })),
  });
}

export function isDraftDirty(draft: SendRuleDraft): boolean {
  return draftSignature(draft.enabled, draft.steps) !== draft.savedSignature;
}

export function setDraftEnabled(draft: SendRuleDraft, enabled: boolean): SendRuleDraft {
  return { ...draft, enabled };
}

export function moveDraftStep(
  draft: SendRuleDraft,
  index: number,
  offset: -1 | 1,
): SendRuleDraft {
  const target = index + offset;
  if (target < 0 || target >= draft.steps.length) {
    return draft;
  }
  const steps = [...draft.steps];
  [steps[index], steps[target]] = [steps[target], steps[index]];
  return { ...draft, steps };
}

export function toggleDraftStep(
  draft: SendRuleDraft,
  id: string,
  stepEnabled: boolean,
): SendRuleDraft {
  return {
    ...draft,
    steps: draft.steps.map((step) =>
      step.id === id ? { ...step, stepEnabled } : step,
    ),
  };
}

export function removeDraftStep(draft: SendRuleDraft, id: string): SendRuleDraft {
  return { ...draft, steps: draft.steps.filter((step) => step.id !== id) };
}

export function addDraftStep(
  draft: SendRuleDraft,
  id: string,
  identityEnabled: boolean,
  accountEnabled = true,
  hasSecret = true,
): SendRuleDraft {
  if (!id || draft.steps.some((step) => step.id === id)) {
    return draft;
  }
  return {
    ...draft,
    steps: [
      ...draft.steps,
      { id, identityEnabled, accountEnabled, hasSecret, stepEnabled: true },
    ],
  };
}

/**
 * Reorders the chain to the provider catalog priority while keeping the current
 * step enablement. Identities outside the supplied order keep their relative
 * order after the known ones.
 */
export function reorderDraftToPriority(
  draft: SendRuleDraft,
  priorityOrder: readonly string[],
): SendRuleDraft {
  const rank = new Map<string, number>();
  priorityOrder.forEach((id, index) => rank.set(id, index));
  const steps = [...draft.steps].sort((left, right) => {
    const leftRank = rank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = rank.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank;
  });
  return { ...draft, steps };
}

/**
 * Validates the draft. An enabled rule must retain at least one active step; a
 * disabled rule may keep an empty or fully disabled chain (it is a deliberate
 * kill switch).
 */
export function validateDraft(draft: SendRuleDraft): SendRuleValidationError | null {
  const ids = new Set<string>();
  for (const step of draft.steps) {
    if (ids.has(step.id)) {
      return "duplicate-step";
    }
    ids.add(step.id);
  }
  if (!draft.enabled) {
    return null;
  }
  if (draft.steps.length === 0) {
    return "empty-chain";
  }
  if (!draft.steps.some((step) => step.stepEnabled)) {
    return "no-enabled-step";
  }
  return null;
}

/** Wire payload steps for the generated update command. */
export function toStepPayload(draft: SendRuleDraft): { id: string; enabled: boolean }[] {
  return draft.steps.map((step) => ({ id: step.id, enabled: step.stepEnabled }));
}

/** Replaces the saved baseline after a successful save. */
export function markDraftSaved(draft: SendRuleDraft): SendRuleDraft {
  return {
    ...draft,
    savedSignature: draftSignature(draft.enabled, draft.steps),
  };
}

/** Restores the last saved enablement/order while keeping identity metadata. */
export function resetDraftToSaved(draft: SendRuleDraft): SendRuleDraft {
  let parsed: {
    enabled?: boolean;
    steps?: { id?: string; enabled?: boolean }[];
  };
  try {
    parsed = JSON.parse(draft.savedSignature) as typeof parsed;
  } catch {
    return draft;
  }
  const savedSteps = Array.isArray(parsed.steps) ? parsed.steps : [];
  const byId = new Map(draft.steps.map((step) => [step.id, step]));
  const steps: SendRuleStepDraft[] = [];
  for (const saved of savedSteps) {
    const id = typeof saved.id === "string" ? saved.id : "";
    const current = byId.get(id);
    if (!current) {
      continue;
    }
    steps.push({ ...current, stepEnabled: saved.enabled === true });
    byId.delete(id);
  }
  // Steps added after the saved baseline have no saved state; keep them at the
  // tail with their current switch so a reset never silently drops them.
  for (const remaining of byId.values()) {
    steps.push(remaining);
  }
  return {
    ...draft,
    enabled: parsed.enabled === true,
    steps,
  };
}
