import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown> | string) => {
      if (typeof options === "string") {
        return options;
      }
      let text = key;
      if (options) {
        for (const [name, value] of Object.entries(options)) {
          text = text.replaceAll(`{{${name}}}`, String(value));
        }
      }
      return text;
    },
  }),
}));

import { ConfirmDialog } from "./components/confirm-dialog.tsx";
import { TemplateEditorPanel } from "./components/template-editor-panel.tsx";
import { TemplateListPanel } from "./components/template-list-panel.tsx";
import { emptyTemplateForm } from "./templateWorkspace.ts";
import type { MessagingTemplate } from "@sdkwork/messaging-pc-core";

const TEMPLATE: MessagingTemplate = {
  id: "7",
  channel: "email",
  templateCode: "order_paid",
  name: "Order paid",
  subject: "Order {{orderId}} paid",
  content: "Hi {{name}}, your order is paid.",
  variables: ["name", "orderId"],
  approvalStatus: "not_applicable",
  status: "active",
  version: "1",
};

const noop = () => undefined;

function listMarkup(selectedId: string | null): string {
  return renderToStaticMarkup(
    createElement(TemplateListPanel, {
      items: [TEMPLATE],
      totalItems: 1,
      page: 1,
      totalPages: 1,
      hasMore: false,
      loading: false,
      keyword: "",
      statusFilter: "",
      selectedId,
      onKeywordChange: noop,
      onStatusFilterChange: noop,
      onSelect: noop,
      onRefresh: noop,
      onPageChange: noop,
    }),
  );
}

function editorMarkup(channel: "email" | "sms", content: string): string {
  const form = { ...emptyTemplateForm(channel), name: "Demo", content };
  return renderToStaticMarkup(
    createElement(TemplateEditorPanel, {
      channel,
      mode: "create",
      templateKey: "test",
      form,
      variables: ["name"],
      samples: {},
      errors: {},
      showValidation: false,
      dirty: true,
      saving: false,
      deleting: false,
      onChange: noop,
      onSampleChange: noop,
      onSave: noop,
      onCancel: noop,
    }),
  );
}

describe("template workbench render", () => {
  it("marks the active list row and exposes the search and status filters", () => {
    const selected = listMarkup("7");
    expect(selected).toContain('aria-current="true"');
    expect(selected).toContain("order_paid");
    expect(selected).toContain("Order paid");
    expect(selected).toContain('placeholder="admin.notify.templates.searchPlaceholder"');
    expect(selected.match(/aria-pressed=/gu)).toHaveLength(4);
    expect(listMarkup(null)).not.toContain('aria-current="true"');
  });

  it("renders the email editor with metadata, content area, and highlighted variables", () => {
    const markup = editorMarkup("email", "Hi {{name}}, welcome.");
    expect(markup).toContain('data-template-editor="email"');
    expect(markup).toContain("<textarea");
    expect(markup).toContain("min-h-[340px]");
    expect(markup).toContain("{{name}}");
    expect(markup).toContain("admin.notify.templates.metadataTitle");
  });

  it("renders HTML previews through a sandboxed iframe and SMS through a handset mock", () => {
    expect(editorMarkup("email", "<p>Hi {{name}}</p>")).toContain('sandbox=""');
    const sms = editorMarkup("sms", "Your code is {{name}}");
    expect(sms).toContain('data-template-editor="sms"');
    expect(sms).toContain("admin.notify.templates.previewSmsHeader");
    expect(sms).toContain("admin.notify.templates.previewSegments");
  });

  it("renders an accessible confirmation dialog", () => {
    const markup = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Discard changes",
        description: "Unsaved edits will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Cancel",
        tone: "danger",
        onConfirm: noop,
        onCancel: noop,
      }),
    );
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Discard changes");
    expect(markup).toContain("Discard");
  });
});
