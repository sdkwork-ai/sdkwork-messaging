import { describe, expect, it } from "vitest";

import {
  renderTemplateTest,
  templateTestPreview,
  templateTestVariables,
  validateTestTarget,
} from "./templateTestSend.ts";

describe("templateTestVariables", () => {
  it("collects variables from content for SMS", () => {
    expect(
      templateTestVariables("sms", "ignored subject", "验证码 {{code}}，{{ttlMinutes}} 分钟内有效"),
    ).toEqual(["code", "ttlMinutes"]);
  });

  it("also collects subject variables for email", () => {
    expect(
      templateTestVariables("email", "订单 {{orderId}} 已支付", "<p>你好 {{userName}}</p>"),
    ).toEqual(["orderId", "userName"]);
  });
});

describe("renderTemplateTest", () => {
  it("substitutes operator values and reports nothing missing", () => {
    const rendered = renderTemplateTest({
      channel: "sms",
      templateCode: "verification_code",
      content: "您的验证码为 {{code}}，{{ttlMinutes}} 分钟内有效。",
      values: { code: "889900", ttlMinutes: "10" },
      target: "13800000000",
    });
    expect(rendered.body).toBe("您的验证码为 889900，10 分钟内有效。");
    expect(rendered.missingVariables).toEqual([]);
  });

  it("falls back to sample values for blank entries and reports them", () => {
    const rendered = renderTemplateTest({
      channel: "sms",
      templateCode: "order_paid",
      content: "订单 {{orderId}} 支付成功，金额 {{amount}}。",
      values: { orderId: "  " },
      target: "13800000000",
    });
    // Blank is replaced by the sample, so no raw token survives a real send.
    expect(rendered.body).not.toContain("{{");
    expect(rendered.missingVariables).toEqual(["orderId", "amount"]);
  });

  it("renders the subject for email and omits it for sms", () => {
    const email = renderTemplateTest({
      channel: "email",
      templateCode: "verification_code",
      subject: "【{{appName}}】验证码 {{code}}",
      content: "<p>{{code}}</p>",
      values: { appName: "Acme", code: "1234" },
      target: "you@example.com",
    });
    expect(email.subject).toBe("【Acme】验证码 1234");
    expect(email.body).toBe("<p>1234</p>");

    const sms = renderTemplateTest({
      channel: "sms",
      templateCode: "verification_code",
      subject: "ignored",
      content: "{{code}}",
      values: { code: "1" },
      target: "13800000000",
    });
    expect(sms.subject).toBeUndefined();
  });

  it("leaves unknown tokens untouched so the preview exposes them", () => {
    const rendered = renderTemplateTest({
      channel: "sms",
      templateCode: "custom",
      content: "hello {{customVar}}",
      values: {},
      target: "13800000000",
    });
    // `customVar` has no sample heuristic, so its own name is the sample.
    expect(rendered.body).toBe("hello customVar");
  });
});

describe("validateTestTarget", () => {
  it("requires a target", () => {
    expect(validateTestTarget("sms", "   ")).toBe(
      "admin.notify.templates.test.targetRequired",
    );
    expect(validateTestTarget("email", "")).toBe(
      "admin.notify.templates.test.targetRequired",
    );
  });

  it("accepts realistic phone formats", () => {
    for (const target of ["13800000000", "+8613800000000", "138 0000 0000", "138-0000-0000"]) {
      expect(validateTestTarget("sms", target), target).toBeNull();
    }
  });

  it("rejects malformed phone numbers", () => {
    for (const target of ["12345", "abc123", "1380000000000000000000"]) {
      expect(validateTestTarget("sms", target), target).toBe(
        "admin.notify.templates.test.targetInvalidPhone",
      );
    }
  });

  it("accepts and rejects email addresses structurally", () => {
    for (const target of ["you@example.com", "no-reply@birdcoder.com", "a.b@sub.example.co"]) {
      expect(validateTestTarget("email", target), target).toBeNull();
    }
    for (const target of ["you@", "@example.com", "you@example", "you@@example.com", "a b@c.com"]) {
      expect(validateTestTarget("email", target), target).toBe(
        "admin.notify.templates.test.targetInvalidEmail",
      );
    }
  });

  it("trims surrounding whitespace before validating", () => {
    expect(validateTestTarget("email", "  you@example.com  ")).toBeNull();
  });
});

describe("templateTestPreview", () => {
  it("counts a short Chinese body as one UCS-2 segment", () => {
    const preview = templateTestPreview({
      body: "您的验证码是 123456，5 分钟内有效。",
      missingVariables: [],
    });
    expect(preview.segments).toBe(1);
  });

  it("flags a body that spans multiple segments", () => {
    const preview = templateTestPreview({
      body: "中".repeat(90),
      missingVariables: [],
    });
    expect(preview.segments).toBeGreaterThan(1);
  });
});
