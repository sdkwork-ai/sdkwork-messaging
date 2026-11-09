import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  emptyTemplateForm,
  formFromTemplate,
  templateFormSignature,
  templatePreviewValues,
  validateTemplateForm,
} from "./templateWorkspace.ts";
import type { MessagingTemplate } from "@sdkwork/messaging-pc-core";

const EMAIL_TEMPLATE: MessagingTemplate = {
  id: "42",
  channel: "email",
  templateCode: "order_paid",
  name: "Order paid",
  subject: "Order {{orderId}} paid",
  content: "Hi {{name}}, your order {{orderId}} is paid.",
  variables: ["name", "orderId"],
  approvalStatus: "not_applicable",
  status: "active",
  version: "3",
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-02T00:00:00Z",
};

describe("template form model", () => {
  it("maps a persisted template into the editor and back", () => {
    const form = formFromTemplate(EMAIL_TEMPLATE);
    expect(form).toEqual({
      templateCode: "order_paid",
      name: "Order paid",
      subject: "Order {{orderId}} paid",
      content: "Hi {{name}}, your order {{orderId}} is paid.",
      status: "active",
      approvalStatus: "not_applicable",
      approvalNote: "",
    });
    expect(templateFormSignature(form)).toBe(templateFormSignature({ ...form }));
  });

  it("seeds channel-appropriate defaults for a new template", () => {
    expect(emptyTemplateForm("email")).toMatchObject({
      status: "draft",
      approvalStatus: "not_applicable",
    });
    expect(emptyTemplateForm("sms")).toMatchObject({
      status: "draft",
      approvalStatus: "pending",
    });
  });

  it("changes the dirty signature on any field edit", () => {
    const form = formFromTemplate(EMAIL_TEMPLATE);
    const baseline = templateFormSignature(form);
    expect(templateFormSignature({ ...form, name: "Renamed" })).not.toBe(baseline);
    expect(templateFormSignature({ ...form, content: "changed" })).not.toBe(baseline);
  });
});

describe("template validation", () => {
  it("requires code, name, subject, and content when creating", () => {
    expect(
      validateTemplateForm("email", "create", emptyTemplateForm("email")),
    ).toEqual({
      templateCode: "admin.notify.templates.validation.codeRequired",
      name: "admin.notify.templates.validation.nameRequired",
      subject: "admin.notify.templates.validation.subjectRequired",
      content: "admin.notify.templates.validation.contentRequired",
    });
  });

  it("skips the immutable code on edit and allows subject-less SMS templates", () => {
    const form = {
      ...formFromTemplate(EMAIL_TEMPLATE),
      templateCode: "",
      subject: "",
    };
    expect(validateTemplateForm("sms", "edit", form)).toEqual({});
    expect(validateTemplateForm("email", "edit", form)).toEqual({
      subject: "admin.notify.templates.validation.subjectRequired",
    });
  });

  it("rejects whitespace codes and over-long names", () => {
    const form = {
      ...formFromTemplate(EMAIL_TEMPLATE),
      templateCode: "has space",
      name: "n".repeat(193),
    };
    expect(validateTemplateForm("email", "create", form)).toMatchObject({
      templateCode: "admin.notify.templates.validation.codeInvalid",
      name: "admin.notify.templates.validation.nameTooLong",
    });
  });
});

describe("template preview values", () => {
  it("fills defaults and lets sample input override them", () => {
    const values = templatePreviewValues(["code", "name"], { name: "Ada" });
    expect(values).toEqual({ code: "123456", name: "Ada" });
  });

  it("falls back to the default when a sample input is cleared", () => {
    expect(templatePreviewValues(["code"], { code: "" })).toEqual({ code: "123456" });
  });
});

describe("template workbench layout contract", () => {
  const pageSource = readFileSync(
    new URL("./pages/TemplateListPage.tsx", import.meta.url),
    "utf8",
  );
  const editorSource = readFileSync(
    new URL("./components/template-editor-panel.tsx", import.meta.url),
    "utf8",
  );
  const previewSource = readFileSync(
    new URL("./components/template-preview.tsx", import.meta.url),
    "utf8",
  );

  it("uses a full-width master-detail split with the editor taking remaining space", () => {
    expect(pageSource).toContain("<TemplateListPanel");
    expect(pageSource).toContain("<TemplateEditorPanel");
    expect(pageSource).toContain("lg:flex-row");
    expect(pageSource).toContain("flex-1");
    // The old centered narrow page and drawer must never come back.
    expect(pageSource).not.toContain("max-w-5xl");
    expect(pageSource).not.toContain("max-w-xl");
  });

  it("renders the preview beside the editor instead of inside a drawer", () => {
    expect(editorSource).toContain("<TemplatePreview");
    expect(editorSource).toContain("xl:sticky");
    expect(previewSource).toContain('sandbox=""');
    expect(previewSource).toContain("srcDoc={document}");
  });
});
