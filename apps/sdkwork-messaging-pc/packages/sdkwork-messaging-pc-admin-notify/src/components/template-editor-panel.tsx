//! Right-hand template editor: metadata, content, variable insertion, live
//! preview, and the field-level validation surface. It fills the remaining
//! viewport width next to the list panel and scrolls independently.

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Braces,
  Check,
  Copy,
  CopyPlus,
  Plus,
  Save,
  Trash2,
  Type,
} from "lucide-react";

import {
  Field,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  StatusPill,
  TextAreaInput,
  TextInput,
  inputClass,
} from "./form";
import { TemplatePreview } from "./template-preview";
import type {
  MessagingTemplateApprovalStatus,
  MessagingTemplateStatus,
} from "../notifyAdminService";
import { smsMetrics, renderTemplatePreview, sampleValueForVariable } from "../templatePreview";
import {
  templatePreviewValues,
  type TemplateEditorMode,
  type TemplateFieldErrors,
  type TemplateFormState,
} from "../templateWorkspace";

export interface TemplateEditorPanelProps {
  channel: "email" | "sms";
  mode: TemplateEditorMode;
  templateKey: string;
  form: TemplateFormState;
  variables: readonly string[];
  samples: Readonly<Record<string, string>>;
  errors: TemplateFieldErrors;
  showValidation: boolean;
  dirty: boolean;
  saving: boolean;
  deleting: boolean;
  onChange: (patch: Partial<TemplateFormState>) => void;
  onSampleChange: (variable: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const STATUS_OPTIONS: readonly MessagingTemplateStatus[] = ["draft", "active", "disabled"];

const APPROVAL_OPTIONS: readonly MessagingTemplateApprovalStatus[] = [
  "pending",
  "approved",
  "rejected",
];

function FieldError({ messageKey }: { messageKey?: string }) {
  const { t } = useTranslation();
  if (!messageKey) {
    return null;
  }
  return (
    <p className="mt-1 flex items-start gap-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {t(messageKey)}
    </p>
  );
}

export function TemplateEditorPanel({
  channel,
  mode,
  templateKey,
  form,
  variables,
  samples,
  errors,
  showValidation,
  dirty,
  saving,
  deleting,
  onChange,
  onSampleChange,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
}: TemplateEditorPanelProps) {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [newVariable, setNewVariable] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setNewVariable("");
    setCopied(false);
  }, [templateKey]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSave]);

  const previewValues = useMemo(
    () => templatePreviewValues(variables, samples),
    [samples, variables],
  );

  const metrics = useMemo(
    () =>
      channel === "sms"
        ? smsMetrics(renderTemplatePreview(form.content, previewValues))
        : null,
    [channel, form.content, previewValues],
  );

  const insertToken = (token: string) => {
    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? form.content.length;
    const end = textarea?.selectionEnd ?? start;
    const next = `${form.content.slice(0, start)}${token}${form.content.slice(end)}`;
    onChange({ content: next });
    window.requestAnimationFrame(() => {
      if (!textarea) {
        return;
      }
      textarea.focus();
      const caret = start + token.length;
      textarea.setSelectionRange(caret, caret);
    });
  };

  const insertCustomVariable = () => {
    const name = newVariable.trim();
    if (!name) {
      return;
    }
    insertToken(`{{${name}}}`);
    setNewVariable("");
  };

  const copyCode = () => {
    if (!form.templateCode) {
      return;
    }
    const clipboard = navigator.clipboard;
    if (clipboard) {
      void clipboard.writeText(form.templateCode).catch(() => undefined);
    }
    setCopied(true);
  };

  const visibleErrors = showValidation ? errors : {};

  return (
    <section
      data-template-editor={channel}
      aria-label={t("admin.notify.templates.editorAria")}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]"
    >
      <header className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-300">
                {mode === "create"
                  ? t("admin.notify.templates.badgeCreate")
                  : t("admin.notify.templates.badgeEdit")}
              </span>
              <StatusPill status={form.status} />
              {dirty ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {t("admin.notify.templates.unsaved")}
                </span>
              ) : null}
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold text-slate-900 dark:text-white">
              {form.name.trim() || t("admin.notify.templates.untitled")}
            </h2>
            <p className="mt-0.5 truncate font-mono text-xs text-slate-400 dark:text-slate-500">
              {form.templateCode.trim() || t("admin.notify.templates.codePending")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onDuplicate ? (
              <button
                type="button"
                onClick={onDuplicate}
                disabled={saving || deleting}
                title={t("admin.notify.templates.duplicateTitle")}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                <CopyPlus className="h-4 w-4" />
                {t("admin.notify.templates.duplicate")}
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting || saving}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" />
                {t("admin.notify.templates.delete")}
              </button>
            ) : null}
            <SecondaryButton onClick={onCancel} disabled={saving || deleting}>
              {t("admin.notify.common.cancel")}
            </SecondaryButton>
            <PrimaryButton
              onClick={onSave}
              disabled={saving || deleting || (mode === "edit" && !dirty)}
            >
              <span className="inline-flex items-center gap-2">
                <Save className="h-4 w-4" />
                {saving ? t("admin.notify.common.saving") : t("admin.notify.templates.save")}
              </span>
            </PrimaryButton>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 xl:p-5">
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:items-start">
          <div className="min-w-0 space-y-4">
            <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <header className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                <Braces className="h-4 w-4 text-sky-500" />
                {t("admin.notify.templates.metadataTitle")}
              </header>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  {mode === "create" ? (
                    <Field
                      label={t("admin.notify.templates.code")}
                      hint={t("admin.notify.templates.codeHint")}
                    >
                      <TextInput
                        value={form.templateCode}
                        onChange={(value) => onChange({ templateCode: value })}
                        placeholder="order_paid_notice"
                      />
                    </Field>
                  ) : (
                    <Field label={t("admin.notify.templates.code")}>
                      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                        <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700 dark:text-slate-200">
                          {form.templateCode}
                        </span>
                        <button
                          type="button"
                          onClick={copyCode}
                          aria-label={t("admin.notify.templates.copyCode")}
                          title={t("admin.notify.templates.copyCode")}
                          className="rounded p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </Field>
                  )}
                  <FieldError messageKey={visibleErrors.templateCode} />
                </div>
                <div>
                  <Field label={t("admin.notify.templates.name")}>
                    <TextInput
                      value={form.name}
                      onChange={(value) => onChange({ name: value })}
                      placeholder={t("admin.notify.templates.namePlaceholder")}
                    />
                  </Field>
                  <FieldError messageKey={visibleErrors.name} />
                </div>
              </div>

              {channel === "email" ? (
                <div>
                  <Field
                    label={t("admin.notify.templates.subject")}
                    hint={t("admin.notify.templates.subjectHint")}
                  >
                    <TextInput
                      value={form.subject}
                      onChange={(value) => onChange({ subject: value })}
                      placeholder={t("admin.notify.templates.subjectPlaceholder")}
                    />
                  </Field>
                  <FieldError messageKey={visibleErrors.subject} />
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("admin.notify.templates.status")}>
                  <SelectInput
                    value={form.status}
                    onChange={(value) =>
                      onChange({ status: value as MessagingTemplateStatus })
                    }
                    options={STATUS_OPTIONS.map((status) => ({
                      value: status,
                      label: t(`admin.notify.status.${status}`),
                    }))}
                  />
                </Field>
                {channel === "sms" ? (
                  <Field
                    label={t("admin.notify.templates.approval")}
                    hint={t("admin.notify.templates.approvalHint")}
                  >
                    <SelectInput
                      value={
                        form.approvalStatus === "not_applicable"
                          ? "pending"
                          : form.approvalStatus
                      }
                      onChange={(value) =>
                        onChange({
                          approvalStatus: value as MessagingTemplateApprovalStatus,
                        })
                      }
                      options={APPROVAL_OPTIONS.map((status) => ({
                        value: status,
                        label: t(`admin.notify.status.${status}`),
                      }))}
                    />
                  </Field>
                ) : null}
              </div>
              {channel === "sms" ? (
                <Field label={t("admin.notify.templates.approvalNote")}>
                  <TextInput
                    value={form.approvalNote}
                    onChange={(value) => onChange({ approvalNote: value })}
                    placeholder={t("admin.notify.templates.approvalNotePlaceholder")}
                  />
                </Field>
              ) : null}
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                  <Type className="h-4 w-4 text-emerald-500" />
                  {t("admin.notify.templates.content")}
                  {metrics ? (
                    <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-300">
                      {t("admin.notify.templates.contentMetrics", {
                        characters: metrics.characters,
                        segments: metrics.segments,
                      })}
                    </span>
                  ) : null}
                </h3>
                <div className="flex items-center gap-1.5">
                  <input
                    value={newVariable}
                    onChange={(event) => setNewVariable(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        insertCustomVariable();
                      }
                    }}
                    placeholder={t("admin.notify.templates.variablePlaceholder")}
                    aria-label={t("admin.notify.templates.variablePlaceholder")}
                    className={`${inputClass} h-8 w-40 py-1 text-xs`}
                  />
                  <button
                    type="button"
                    onClick={insertCustomVariable}
                    disabled={!newVariable.trim()}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("admin.notify.templates.insertVariable")}
                  </button>
                </div>
              </header>
              <TextAreaInput
                value={form.content}
                onChange={(content) => onChange({ content })}
                inputRef={contentRef}
                ariaLabel={t("admin.notify.templates.content")}
                placeholder={
                  channel === "email"
                    ? t("admin.notify.templates.contentPlaceholderEmail")
                    : t("admin.notify.templates.contentPlaceholderSms")
                }
                rows={16}
                className="min-h-[340px] text-[13px] leading-relaxed 2xl:min-h-[420px]"
              />
              <FieldError messageKey={visibleErrors.content} />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {t("admin.notify.templates.detectedVariables")}
                </span>
                {variables.length === 0 ? (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {t("admin.notify.templates.noVariables")}
                  </span>
                ) : (
                  variables.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertToken(`{{${variable}}}`)}
                      title={t("admin.notify.templates.insertVariableTitle", { name: variable })}
                      className="rounded-full bg-sky-50 px-2 py-0.5 font-mono text-[11px] text-sky-700 transition-colors hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
                    >
                      {`{{${variable}}}`}
                    </button>
                  ))
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                {channel === "sms"
                  ? t("admin.notify.templates.segmentHint")
                  : t("admin.notify.templates.variableHint")}
              </p>
            </section>
          </div>

          <div className="min-w-0 space-y-4 2xl:sticky 2xl:top-0">
            <TemplatePreview
              channel={channel}
              templateKey={templateKey}
              subject={form.subject}
              content={form.content}
              values={previewValues}
            />
            <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <header>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                  {t("admin.notify.templates.samplesTitle")}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                  {t("admin.notify.templates.samplesHint")}
                </p>
              </header>
              {variables.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t("admin.notify.templates.samplesEmpty")}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {variables.map((variable) => (
                    <Field key={variable} label={`{{${variable}}}`}>
                      <TextInput
                        value={samples[variable] ?? ""}
                        onChange={(value) => onSampleChange(variable, value)}
                        placeholder={sampleValueForVariable(variable)}
                      />
                    </Field>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
