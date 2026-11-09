import { describe, expect, it } from "vitest";

import {
  buildEmailPreviewDocument,
  defaultSampleValues,
  escapeHtml,
  extractTemplateVariables,
  looksLikeHtml,
  renderTemplatePreview,
  sampleValueForVariable,
  smsMetrics,
} from "./templatePreview.ts";

describe("template variables", () => {
  it("extracts unique names in first-appearance order", () => {
    expect(
      extractTemplateVariables("Hi {{name}}, code {{code}} again {{code}} — {{ spaced }}"),
    ).toEqual(["name", "code", "spaced"]);
  });

  it("substitutes known values and keeps unresolved tokens visible", () => {
    expect(
      renderTemplatePreview("Hi {{name}}, code {{code}}", { name: "Alex" }),
    ).toBe("Hi Alex, code {{code}}");
  });

  it("provides realistic sample values for common variable names", () => {
    expect(sampleValueForVariable("verificationCode")).toBe("123456");
    expect(sampleValueForVariable("orderId")).toBe("SO202611090001");
    expect(sampleValueForVariable("amount")).toBe("¥100.00");
    expect(sampleValueForVariable("userName")).toBe("Alex");
    expect(sampleValueForVariable("customField")).toBe("customField");
    expect(defaultSampleValues(["code", "name"])).toEqual({
      code: "123456",
      name: "Alex",
    });
  });
});

describe("email preview document", () => {
  it("detects markup and escapes plain text", () => {
    expect(looksLikeHtml("<p>Hello</p>")).toBe(true);
    expect(looksLikeHtml("Plain text with {{name}}")).toBe(false);
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });

  it("escapes text mode so embedded markup never renders", () => {
    const document = buildEmailPreviewDocument({
      content: "<script>alert(1)</script>\n{{name}}",
      values: { name: "<b>Alex</b>" },
      mode: "text",
    });
    expect(document).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(document).toContain("&lt;b&gt;Alex&lt;/b&gt;");
    expect(document).not.toContain("<script>alert(1)</script>");
  });

  it("keeps markup in html mode", () => {
    const document = buildEmailPreviewDocument({
      content: "<p>Hi {{name}}</p>",
      values: { name: "Alex" },
      mode: "html",
    });
    expect(document).toContain("<p>Hi Alex</p>");
  });
});

describe("sms segment metrics", () => {
  it("reports zero segments for empty content", () => {
    expect(smsMetrics("")).toMatchObject({
      characters: 0,
      segments: 0,
      encoding: "gsm7",
      remainingInSegment: 160,
    });
  });

  it("uses GSM-7 single and multi segment limits", () => {
    expect(smsMetrics("a".repeat(160))).toMatchObject({
      characters: 160,
      septets: 160,
      segments: 1,
      remainingInSegment: 0,
    });
    expect(smsMetrics("a".repeat(161))).toMatchObject({
      septets: 161,
      segments: 2,
      remainingInSegment: 145,
    });
    expect(smsMetrics("a".repeat(306))).toMatchObject({
      segments: 2,
      remainingInSegment: 0,
    });
  });

  it("counts GSM-7 extension characters as two septets", () => {
    expect(smsMetrics("€")).toMatchObject({
      characters: 1,
      septets: 2,
      segments: 1,
      remainingInSegment: 158,
    });
  });

  it("falls back to UCS-2 for Chinese and emoji", () => {
    expect(smsMetrics("中".repeat(70))).toMatchObject({
      characters: 70,
      segments: 1,
      encoding: "ucs2",
      remainingInSegment: 0,
    });
    expect(smsMetrics("中".repeat(71))).toMatchObject({
      characters: 71,
      segments: 2,
      remainingInSegment: 63,
    });
    expect(smsMetrics("😀")).toMatchObject({
      characters: 2,
      segments: 1,
      encoding: "ucs2",
      remainingInSegment: 68,
    });
  });
});
