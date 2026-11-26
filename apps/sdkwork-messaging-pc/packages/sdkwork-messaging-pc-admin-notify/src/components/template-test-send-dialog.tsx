//! Template test-send dialog.
//!
//! Operators need to prove a template actually delivers before wiring it into a
//! journey. The dialog takes one delivery target, optional values for the
//! template's variables, shows the rendered result, and enqueues a real outbound
//! message so the operator can confirm receipt end to end.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Send } from "lucide-react";

import {
  Field,
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from "./form";
import { OverlayPortal } from "./overlay-portal";
import {
  renderTemplateTest,
  templateTestPreview,
  templateTestVariables,
  validateTestTarget,
  type TemplateTestChannel,
} from "../templateTestSend";

export interface TemplateTestSendDialogProps {
  channel: TemplateTestChannel;
  templateCode: string;
  templateName: string;
  subject?: string | null;
  content: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (payload: { target: string; body: string; subject?: string }) => void;
}

export function TemplateTestSendDialog({
  channel,
  templateCode,
  templateName,
  subject,
  content,
  busy,
  error,
  onCancel,
  onSubmit,
}: TemplateTestSendDialogProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);

  const variables = useMemo(
    () => templateTestVariables(channel, subject, content),
    [channel, subject, content],
  );

  const rendered = useMemo(
    () =>
      renderTemplateTest({
        channel,
        templateCode,
        subject,
        content,
        values,
        target,
      }),
    [channel, templateCode, subject, content, values, target],
  );

  const preview = useMemo(() => templateTestPreview(rendered), [rendered]);
  const targetError = validateTestTarget(channel, target);
  const canSubmit = !busy && targetError === null;

  const submit = () => {
    setShowValidation(true);
    if (targetError !== null) {
      return;
    }
    onSubmit({
      target: target.trim(),
      body: rendered.body,
      ...(channel === "email" && rendered.subject !== undefined
        ? { subject: rendered.subject }
        : {}),
    });
  };

  return (
    <OverlayPortal
      onDismiss={onCancel}
      onEscape={onCancel}
      zIndexClass="z-[110]"
      className="flex items-center justify-center bg-slate-900/40 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("admin.notify.templates.test.title")}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#1a1a1a]"
      >
        <div className="border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            {t("admin.notify.templates.test.title")}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("admin.notify.templates.test.description", { name: templateName })}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <Field
            label={
              channel === "email"
                ? t("admin.notify.templates.test.emailTarget")
                : t("admin.notify.templates.test.smsTarget")
            }
            hint={
              channel === "email"
                ? t("admin.notify.templates.test.emailTargetHint")
                : t("admin.notify.templates.test.smsTargetHint")
            }
          >
            <TextInput
              value={target}
              onChange={setTarget}
              placeholder={
                channel === "email" ? "you@example.com" : "13800000000"
              }
            />
          </Field>
          {showValidation && targetError ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {t(targetError)}
            </p>
          ) : null}

          {variables.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("admin.notify.templates.test.variablesTitle")}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {t("admin.notify.templates.test.variablesHint")}
              </p>
              {variables.map((variable) => (
                <Field key={variable} label={variable}>
                  <TextInput
                    value={values[variable] ?? ""}
                    onChange={(value) =>
                      setValues((current) => ({ ...current, [variable]: value }))
                    }
                    placeholder={t("admin.notify.templates.test.variablePlaceholder")}
                  />
                </Field>
              ))}
            </div>
          ) : null}

          <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-white/5">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {t("admin.notify.templates.test.previewTitle")}
            </p>
            {channel === "email" && rendered.subject ? (
              <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                {t("admin.notify.templates.previewSubject")}：{rendered.subject}
              </p>
            ) : null}
            <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {rendered.body}
            </p>
            {channel === "sms" ? (
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                {t("admin.notify.templates.contentMetrics", {
                  characters: preview.characters,
                  segments: preview.segments,
                })}
                {preview.segments > 1
                  ? ` · ${t("admin.notify.templates.test.multiSegment")}`
                  : ""}
              </p>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <SecondaryButton onClick={onCancel} disabled={busy}>
            {t("admin.notify.common.cancel")}
          </SecondaryButton>
          <PrimaryButton onClick={submit} disabled={!canSubmit}>
            <span className="inline-flex items-center gap-2">
              <Send className="h-4 w-4" />
              {busy
                ? t("admin.notify.templates.test.sending")
                : t("admin.notify.templates.test.send")}
            </span>
          </PrimaryButton>
        </div>
      </div>
    </OverlayPortal>
  );
}
