/**
 * Pure template presentation helpers shared by the template workbench.
 *
 * Keeping variable substitution, HTML escaping/detection, and SMS segment
 * math here lets the editor render a faithful preview and lets the unit tests
 * pin the behavior that operators rely on (character counts, billed segments,
 * sandboxed HTML previews).
 */

export const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/gu;

/** Unique variable names in first-appearance order. */
export function extractTemplateVariables(content: string): string[] {
  const variables: string[] = [];
  for (const match of content.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const name = match[1];
    if (!variables.includes(name)) {
      variables.push(name);
    }
  }
  return variables;
}

/**
 * Substitutes `{{name}}` tokens with sample values. Unknown variables keep
 * their token so the preview shows exactly what still needs a value.
 */
export function renderTemplatePreview(
  content: string,
  values: Readonly<Record<string, string>>,
): string {
  return content.replace(TEMPLATE_VARIABLE_PATTERN, (token, name: string) => {
    const value = values[name];
    return value === undefined || value === "" ? token : value;
  });
}

/** Realistic default sample value for a variable name (case-insensitive). */
export function sampleValueForVariable(name: string): string {
  const normalized = name.toLowerCase();
  if (/(code|captcha|otp|pin|verify)/u.test(normalized)) {
    return "123456";
  }
  if (/(phone|mobile|tel)/u.test(normalized)) {
    return "138****0000";
  }
  if (/(email|mail)/u.test(normalized)) {
    return "user@example.com";
  }
  if (/(order|trade|invoice)/u.test(normalized)) {
    return "SO202611090001";
  }
  if (/(amount|price|total|fee|balance)/u.test(normalized)) {
    return "¥100.00";
  }
  if (/(date|time)/u.test(normalized)) {
    return "2026-11-09 12:00";
  }
  if (/(url|link)/u.test(normalized)) {
    return "https://example.com";
  }
  if (/(name|user|nick)/u.test(normalized)) {
    return "Alex";
  }
  return name;
}

/** Default sample payload for a set of detected variables. */
export function defaultSampleValues(
  variables: readonly string[],
): Record<string, string> {
  return Object.fromEntries(
    variables.map((variable) => [variable, sampleValueForVariable(variable)]),
  );
}

const HTML_HINT_PATTERN =
  /<(?:!doctype|html|head|body|table|thead|tbody|div|p|span|br|hr|h[1-6]|ul|ol|li|a|img|strong|em|section|article)\b/iu;

/** Heuristic: the content carries markup rather than plain text. */
export function looksLikeHtml(content: string): boolean {
  return HTML_HINT_PATTERN.test(content);
}

const HTML_ESCAPE_PATTERN: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => HTML_ESCAPE_PATTERN[character]);
}

export interface EmailPreviewDocumentInput {
  readonly content: string;
  readonly values: Readonly<Record<string, string>>;
  readonly mode: "text" | "html";
}

/**
 * Full `srcDoc` for the sandboxed preview iframe. HTML mode embeds the
 * substituted markup verbatim; text mode escapes it and preserves line breaks.
 * The iframe is rendered with an empty `sandbox` attribute, so scripts never
 * execute and the document stays on an opaque origin.
 */
export function buildEmailPreviewDocument({
  content,
  values,
  mode,
}: EmailPreviewDocumentInput): string {
  const substituted =
    mode === "html"
      ? // Variable values are plain text; escaping them keeps a sample value
        // from injecting structure into the previewed markup.
        content.replace(TEMPLATE_VARIABLE_PATTERN, (token, name: string) => {
          const value = values[name];
          return value === undefined || value === "" ? token : escapeHtml(value);
        })
      : renderTemplatePreview(content, values);
  const body =
    mode === "html"
      ? substituted
      : `<pre class="plain-text">${escapeHtml(substituted)}</pre>`;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  html, body { margin: 0; padding: 0; }
  body {
    box-sizing: border-box;
    min-height: 100vh;
    padding: 24px;
    background: #ffffff;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 14px;
    line-height: 1.65;
    word-break: break-word;
  }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; border-collapse: collapse; }
  a { color: #0369a1; }
  .plain-text {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: inherit;
  }
</style>
</head>
<body>${body}</body>
</html>`;
}

export type SmsEncoding = "gsm7" | "ucs2";

export interface SmsMetrics {
  /** UTF-16 code units, the unit carriers bill against. */
  readonly characters: number;
  /** GSM-7 septets (extension characters cost two). */
  readonly septets: number;
  readonly encoding: SmsEncoding;
  /** Billed message segments; 0 for empty content. */
  readonly segments: number;
  /** Characters still available in the current segment. */
  readonly remainingInSegment: number;
}

// GSM 03.38 basic character set plus the extension table.
const GSM7_BASIC = new Set([
  ..."@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
]);
const GSM7_EXTENSION = new Set([..."^{}\\[~]|€"]);

const GSM7_SINGLE_SEGMENT = 160;
const GSM7_MULTI_SEGMENT = 153;
const UCS2_SINGLE_SEGMENT = 70;
const UCS2_MULTI_SEGMENT = 67;

function remainingInLastSegment(used: number, multiCapacity: number, singleCapacity: number, segments: number): number {
  if (segments === 0) {
    return singleCapacity;
  }
  if (segments === 1) {
    return singleCapacity - used;
  }
  const usedInLast = used - (segments - 1) * multiCapacity;
  return usedInLast === 0 ? multiCapacity : multiCapacity - usedInLast;
}

/** Carrier-accurate segment math for a completed outbound SMS body. */
export function smsMetrics(text: string): SmsMetrics {
  const characters = text.length;
  let septets = 0;
  let gsm7 = true;
  for (const character of text) {
    if (GSM7_BASIC.has(character)) {
      septets += 1;
    } else if (GSM7_EXTENSION.has(character)) {
      septets += 2;
    } else {
      gsm7 = false;
      break;
    }
  }

  if (gsm7) {
    const segments =
      septets === 0
        ? 0
        : septets <= GSM7_SINGLE_SEGMENT
          ? 1
          : Math.ceil(septets / GSM7_MULTI_SEGMENT);
    return {
      characters,
      septets,
      encoding: "gsm7",
      segments,
      remainingInSegment: remainingInLastSegment(
        septets,
        GSM7_MULTI_SEGMENT,
        GSM7_SINGLE_SEGMENT,
        segments,
      ),
    };
  }

  const segments =
    characters === 0
      ? 0
      : characters <= UCS2_SINGLE_SEGMENT
        ? 1
        : Math.ceil(characters / UCS2_MULTI_SEGMENT);
  return {
    characters,
    septets: 0,
    encoding: "ucs2",
    segments,
    remainingInSegment: remainingInLastSegment(
      characters,
      UCS2_MULTI_SEGMENT,
      UCS2_SINGLE_SEGMENT,
      segments,
    ),
  };
}
