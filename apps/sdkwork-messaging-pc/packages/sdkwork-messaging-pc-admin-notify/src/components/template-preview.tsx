//! Live template preview: rendered email canvas (text or sandboxed HTML) and
//! an SMS handset mock with carrier segment metrics.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Code2, Mail, MessageSquareText, MonitorSmartphone, Type } from "lucide-react";

import {
  buildEmailPreviewDocument,
  looksLikeHtml,
  renderTemplatePreview,
  smsMetrics,
  TEMPLATE_VARIABLE_PATTERN,
} from "../templatePreview";

export interface TemplatePreviewProps {
  channel: "email" | "sms";
  /** Changes when another template is selected; resets the email mode. */
  templateKey: string;
  subject: string;
  content: string;
  values: Readonly<Record<string, string>>;
}

type EmailPreviewMode = "text" | "html";

/** Renders unresolved `{{variable}}` tokens with a visible accent. */
function withVariableHighlight(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  for (const match of text.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }
    nodes.push(
      <span
        key={`variable-${index}`}
        className="rounded bg-amber-100 px-1 font-mono text-[0.95em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
      >
        {match[0]}
      </span>,
    );
    cursor = start + match[0].length;
    index += 1;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

function EmailPreview({
  content,
  subject,
  values,
  mode,
}: {
  content: string;
  subject: string;
  values: Readonly<Record<string, string>>;
  mode: EmailPreviewMode;
}) {
  const { t } = useTranslation();
  const previewSubject = renderTemplatePreview(subject, values);
  const document = useMemo(
    () => buildEmailPreviewDocument({ content, values, mode }),
    [content, mode, values],
  );

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex items-start gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/5">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t("admin.notify.templates.previewSubject")}
            </p>
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {previewSubject.trim() || t("admin.notify.templates.previewSubjectEmpty")}
            </p>
          </div>
        </div>
        {mode === "html" ? (
          <iframe
            title={t("admin.notify.templates.previewHtmlFrameTitle")}
            sandbox=""
            referrerPolicy="no-referrer"
            srcDoc={document}
            className="h-[420px] w-full rounded-b-xl bg-white 2xl:h-[520px]"
          />
        ) : (
          <div className="max-h-[420px] min-h-[220px] overflow-y-auto whitespace-pre-wrap break-words px-5 py-4 text-sm leading-relaxed text-slate-700 2xl:max-h-[520px] dark:text-slate-200">
            {content.trim() ? withVariableHighlight(renderTemplatePreview(content, values)) : (
              <span className="text-slate-400 dark:text-slate-500">
                {t("admin.notify.templates.previewEmpty")}
              </span>
            )}
          </div>
        )}
      </div>
      {mode === "html" ? (
        <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          {t("admin.notify.templates.previewSandboxHint")}
        </p>
      ) : null}
    </div>
  );
}

function SmsPreview({
  content,
  values,
}: {
  content: string;
  values: Readonly<Record<string, string>>;
}) {
  const { t } = useTranslation();
  const rendered = renderTemplatePreview(content, values);
  const metrics = useMemo(() => smsMetrics(rendered), [rendered]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto w-full max-w-[340px] rounded-[26px] border border-slate-300 bg-white p-3 shadow-inner dark:border-white/10 dark:bg-[#1a1a1a]">
          <div className="mb-3 flex items-center justify-between px-1 text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="h-3 w-3" />
              {t("admin.notify.templates.previewSmsHeader")}
            </span>
            <span>9:41</span>
          </div>
          <div className="max-h-[360px] min-h-[120px] overflow-y-auto rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm dark:bg-white/10 dark:text-slate-100">
              {content.trim() ? (
                <p className="whitespace-pre-wrap break-words">{withVariableHighlight(rendered)}</p>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">
                  {t("admin.notify.templates.previewEmpty")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-white/10 dark:bg-[#1a1a1a]">
          <dt className="text-[11px] text-slate-400 dark:text-slate-500">
            {t("admin.notify.templates.previewCharacters")}
          </dt>
          <dd className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {metrics.characters}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-white/10 dark:bg-[#1a1a1a]">
          <dt className="text-[11px] text-slate-400 dark:text-slate-500">
            {t("admin.notify.templates.previewSegments")}
          </dt>
          <dd className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {metrics.segments}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-white/10 dark:bg-[#1a1a1a]">
          <dt className="text-[11px] text-slate-400 dark:text-slate-500">
            {t("admin.notify.templates.previewEncoding")}
          </dt>
          <dd className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {metrics.encoding === "gsm7" ? "GSM-7" : "UCS-2"}
          </dd>
        </div>
      </dl>
      <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        {t("admin.notify.templates.previewSmsHint", {
          remaining: metrics.remainingInSegment,
        })}
      </p>
      <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        {t("admin.notify.templates.previewSmsSignatureHint")}
      </p>
    </div>
  );
}

export function TemplatePreview({
  channel,
  templateKey,
  subject,
  content,
  values,
}: TemplatePreviewProps) {
  const { t } = useTranslation();
  const [emailMode, setEmailMode] = useState<EmailPreviewMode>(() =>
    looksLikeHtml(content) ? "html" : "text",
  );
  const [modeManuallySet, setModeManuallySet] = useState(false);

  useEffect(() => {
    setEmailMode(looksLikeHtml(content) ? "html" : "text");
    setModeManuallySet(false);
    // Reset only when another template is opened; typing must not flip the
    // operator's explicit mode choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateKey]);

  useEffect(() => {
    if (!modeManuallySet) {
      setEmailMode(looksLikeHtml(content) ? "html" : "text");
    }
  }, [content, modeManuallySet]);

  return (
    <section className="flex min-h-0 min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          <MonitorSmartphone className="h-4 w-4 text-sky-500" />
          {t("admin.notify.templates.previewTitle")}
        </h3>
        {channel === "email" ? (
          <div
            role="group"
            aria-label={t("admin.notify.templates.previewModeAria")}
            className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/5"
          >
            {(
              [
                ["text", t("admin.notify.templates.previewModeText"), Type],
                ["html", t("admin.notify.templates.previewModeHtml"), Code2],
              ] as const
            ).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={emailMode === mode}
                onClick={() => {
                  setEmailMode(mode);
                  setModeManuallySet(true);
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  emailMode === mode
                    ? "bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </header>
      {channel === "email" ? (
        <EmailPreview content={content} subject={subject} values={values} mode={emailMode} />
      ) : (
        <SmsPreview content={content} values={values} />
      )}
    </section>
  );
}
