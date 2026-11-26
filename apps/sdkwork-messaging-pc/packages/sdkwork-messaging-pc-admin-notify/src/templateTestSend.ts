/**
 * Pure helpers for the template test-send flow.
 *
 * A test send must prove what the recipient will actually receive, so this
 * module renders the template with the operator's sample values, validates the
 * delivery target per channel, and builds the outbound send request. Keeping it
 * free of React lets the rules be unit tested.
 */

import {
  defaultSampleValues,
  extractTemplateVariables,
  renderTemplatePreview,
  smsMetrics,
} from "./templatePreview";

export type TemplateTestChannel = "email" | "sms";

export interface TemplateTestInput {
  readonly channel: TemplateTestChannel;
  readonly templateCode: string;
  readonly subject?: string | null;
  readonly content: string;
  /** Operator-supplied values; missing keys fall back to realistic samples. */
  readonly values: Readonly<Record<string, string>>;
  /** Phone number or email address depending on channel. */
  readonly target: string;
}

export interface RenderedTemplateTest {
  readonly subject?: string;
  readonly body: string;
  /** Variables still replaced by a sample because the operator left them blank. */
  readonly missingVariables: readonly string[];
}

/** Variables used by `subject` and `content`, de-duplicated, stable order. */
export function templateTestVariables(
  channel: TemplateTestChannel,
  subject: string | null | undefined,
  content: string,
): string[] {
  const combined = channel === "email" ? `${subject ?? ""} ${content}` : content;
  return extractTemplateVariables(combined);
}

/** Every `{{variable}}` must resolve; blanks fall back to a sample value. */
export function renderTemplateTest(input: TemplateTestInput): RenderedTemplateTest {
  const variables = templateTestVariables(input.channel, input.subject, input.content);
  const defaults = defaultSampleValues(variables);
  const resolved: Record<string, string> = {};
  const missing: string[] = [];
  for (const variable of variables) {
    const raw = input.values[variable];
    const value = raw === undefined || raw.trim() === "" ? defaults[variable] : raw;
    if (raw === undefined || raw.trim() === "") {
      missing.push(variable);
    }
    resolved[variable] = value;
  }
  const body = renderTemplatePreview(input.content, resolved);
  if (input.channel !== "email") {
    return { body, missingVariables: missing };
  }
  return {
    subject: renderTemplatePreview(input.subject ?? "", resolved),
    body,
    missingVariables: missing,
  };
}

export type TargetErrorKey =
  | "admin.notify.templates.test.targetRequired"
  | "admin.notify.templates.test.targetInvalidPhone"
  | "admin.notify.templates.test.targetInvalidEmail";

/**
 * Validates a delivery target for the channel.
 *
 * Deliberately permissive for phone numbers: carriers accept local, E.164 and
 * spaced formats, and a test send is the wrong place to reject a number the
 * operator's carrier would accept. Email gets a structural check only.
 */
export function validateTestTarget(
  channel: TemplateTestChannel,
  target: string,
): TargetErrorKey | null {
  const trimmed = target.trim();
  if (trimmed === "") {
    return "admin.notify.templates.test.targetRequired";
  }
  if (channel === "sms") {
    const digits = trimmed.replace(/[\s\-()]/gu, "");
    if (!/^\+?\d{6,20}$/u.test(digits)) {
      return "admin.notify.templates.test.targetInvalidPhone";
    }
    return null;
  }
  // One `@`, a non-empty local part, and a dotted domain with a real TLD.
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(trimmed)) {
    return "admin.notify.templates.test.targetInvalidEmail";
  }
  return null;
}

/** Short provider-independent summary shown in the dialog before sending. */
export interface TemplateTestPreview {
  readonly segments: number;
  readonly characters: number;
  readonly remainingInSegment: number;
}

export function templateTestPreview(rendered: RenderedTemplateTest): TemplateTestPreview {
  const metrics = smsMetrics(rendered.body);
  return {
    segments: metrics.segments,
    characters: metrics.characters,
    remainingInSegment: metrics.remainingInSegment,
  };
}
