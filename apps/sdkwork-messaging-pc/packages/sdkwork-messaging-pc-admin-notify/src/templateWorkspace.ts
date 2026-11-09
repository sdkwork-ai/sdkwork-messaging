/**
 * Template workbench form model: mapping persisted templates into the editor,
 * channel-aware validation, and dirty-state signatures. Kept free of React so
 * the rules can be unit tested.
 */

import type { MessagingTemplate } from "@sdkwork/messaging-pc-core";

import type {
  MessagingTemplateApprovalStatus,
  MessagingTemplateStatus,
} from "./notifyAdminService";
import { defaultSampleValues } from "./templatePreview";

export type TemplateEditorMode = "create" | "edit";

export interface TemplateFormState {
  templateCode: string;
  name: string;
  subject: string;
  content: string;
  status: MessagingTemplateStatus;
  approvalStatus: MessagingTemplateApprovalStatus;
  approvalNote: string;
}

export type TemplateField = "templateCode" | "name" | "subject" | "content";

export type TemplateFieldErrors = Partial<Record<TemplateField, string>>;

export const TEMPLATE_CODE_MAX_LENGTH = 128;
export const TEMPLATE_NAME_MAX_LENGTH = 192;

export function emptyTemplateForm(channel: "email" | "sms"): TemplateFormState {
  return {
    templateCode: "",
    name: "",
    subject: "",
    content: "",
    status: "draft",
    approvalStatus: channel === "sms" ? "pending" : "not_applicable",
    approvalNote: "",
  };
}

export function formFromTemplate(template: MessagingTemplate): TemplateFormState {
  return {
    templateCode: template.templateCode,
    name: template.name,
    subject: template.subject ?? "",
    content: template.content,
    status: template.status,
    // An SMS template is always in a provider review state; treat a legacy
    // `not_applicable` row as pending instead of rendering an empty select.
    approvalStatus:
      template.channel === "sms" && template.approvalStatus === "not_applicable"
        ? "pending"
        : template.approvalStatus,
    approvalNote: template.approvalNote ?? "",
  };
}

/** Stable string used to detect unsaved edits. */
export function templateFormSignature(form: TemplateFormState): string {
  return JSON.stringify(form);
}

/**
 * Field errors as i18n message keys. Empty object means the form can be saved.
 */
export function validateTemplateForm(
  channel: "email" | "sms",
  mode: TemplateEditorMode,
  form: TemplateFormState,
): TemplateFieldErrors {
  const errors: TemplateFieldErrors = {};
  const code = form.templateCode.trim();
  if (mode === "create") {
    if (!code) {
      errors.templateCode = "admin.notify.templates.validation.codeRequired";
    } else if (/\s/u.test(code) || code.length > TEMPLATE_CODE_MAX_LENGTH) {
      errors.templateCode = "admin.notify.templates.validation.codeInvalid";
    }
  }
  const name = form.name.trim();
  if (!name) {
    errors.name = "admin.notify.templates.validation.nameRequired";
  } else if (name.length > TEMPLATE_NAME_MAX_LENGTH) {
    errors.name = "admin.notify.templates.validation.nameTooLong";
  }
  if (channel === "email" && !form.subject.trim()) {
    errors.subject = "admin.notify.templates.validation.subjectRequired";
  }
  if (!form.content.trim()) {
    errors.content = "admin.notify.templates.validation.contentRequired";
  }
  return errors;
}

/** Sample payload for the live preview, falling back to realistic defaults. */
export function templatePreviewValues(
  variables: readonly string[],
  samples: Readonly<Record<string, string>>,
): Record<string, string> {
  const defaults = defaultSampleValues(variables);
  const values: Record<string, string> = {};
  for (const variable of variables) {
    const sample = samples[variable];
    values[variable] = sample === undefined || sample === "" ? defaults[variable] : sample;
  }
  return values;
}
