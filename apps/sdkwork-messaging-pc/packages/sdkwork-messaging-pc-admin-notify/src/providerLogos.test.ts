import { describe, expect, it } from "vitest";
import { EMAIL_PROVIDER_CATALOG } from "./emailProviderCatalog";
import { SMS_PROVIDER_CATALOG } from "./smsProviderCatalog";
import { providerLogoKind } from "./providerLogos";

describe("provider brand marks", () => {
  it("covers every email provider with a real glyph, wordmark, or channel icon", () => {
    for (const entry of EMAIL_PROVIDER_CATALOG) {
      const kind = providerLogoKind(entry.provider);
      expect(kind, `${entry.provider} must have a dedicated mark`).not.toBe("fallback");
    }
  });

  it("covers every SMS provider with a real glyph, wordmark, or channel icon", () => {
    for (const entry of SMS_PROVIDER_CATALOG) {
      const kind = providerLogoKind(entry.provider);
      expect(kind, `${entry.provider} must have a dedicated mark`).not.toBe("fallback");
    }
  });

  it("uses the official brand glyphs where an open mark exists", () => {
    expect(providerLogoKind("gmail")).toBe("glyph");
    expect(providerLogoKind("sendgrid")).toBe("glyph");
    expect(providerLogoKind("twilio")).toBe("glyph");
    expect(providerLogoKind("aliyun")).toBe("glyph");
    expect(providerLogoKind("huawei")).toBe("glyph");
    expect(providerLogoKind("microsoft")).toBe("microsoft");
  });
});
