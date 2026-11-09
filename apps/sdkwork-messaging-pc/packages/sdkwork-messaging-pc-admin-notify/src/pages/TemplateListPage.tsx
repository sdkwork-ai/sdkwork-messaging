import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Mail, MessageSquareText, Plus, X } from "lucide-react";

import {
  ErrorState,
  PageHeader,
  PrimaryButton,
} from "../components/form";
import { PageErrorBoundary } from "../components/page-error-boundary";
import { ConfirmDialog } from "../components/confirm-dialog";
import { TemplateEditorPanel } from "../components/template-editor-panel";
import { TemplateListPanel } from "../components/template-list-panel";
import {
  defaultNotifyAdminService,
  isConflictError,
  type MessagingTemplateApprovalStatus,
  type MessagingTemplateStatus,
  type NotifyAdminService,
} from "../notifyAdminService";
import { extractTemplateVariables } from "../templatePreview";
import {
  emptyTemplateForm,
  formFromTemplate,
  templateFormSignature,
  validateTemplateForm,
  type TemplateEditorMode,
  type TemplateFormState,
} from "../templateWorkspace";
import type { MessagingTemplate } from "@sdkwork/messaging-pc-core";

export interface SdkworkMessagingTemplateListPageProps {
  channel: "email" | "sms";
  service?: NotifyAdminService;
}

const PAGE_SIZE = 20;
const KEYWORD_DEBOUNCE_MS = 300;

interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "default" | "danger";
  action: () => void;
}

export function TemplateListPage({ channel, service }: SdkworkMessagingTemplateListPageProps) {
  const { t } = useTranslation();
  const admin = service ?? defaultNotifyAdminService;

  const [items, setItems] = useState<MessagingTemplate[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [mode, setMode] = useState<"idle" | TemplateEditorMode>("idle");
  const [editingTemplate, setEditingTemplate] = useState<MessagingTemplate | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const [form, setForm] = useState<TemplateFormState>(() => emptyTemplateForm(channel));
  const [baseline, setBaseline] = useState<string>(() =>
    templateFormSignature(emptyTemplateForm(channel)),
  );
  const [samples, setSamples] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const loadSequence = useRef(0);

  useEffect(() => {
    if (keyword.trim() === "") {
      setDebouncedKeyword("");
      return;
    }
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), KEYWORD_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  // Channel changes are only reachable through a different route element, but
  // resetting keeps a host that reuses the component instance honest.
  useEffect(() => {
    setMode("idle");
    setEditingTemplate(null);
    setSelectedId(null);
    setSamples({});
    setShowValidation(false);
  }, [channel]);

  const load = useCallback(
    async (targetPage: number) => {
      // Fast typing/filter changes can resolve out of order; only the newest
      // request may write list state.
      const sequence = loadSequence.current + 1;
      loadSequence.current = sequence;
      setLoading(true);
      setError(null);
      try {
        const result = await admin.listTemplates({
          channel,
          status: (statusFilter || undefined) as MessagingTemplateStatus | undefined,
          q: debouncedKeyword || undefined,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        if (loadSequence.current !== sequence) {
          return;
        }
        setItems(result.items);
        setTotalItems(result.totalItems);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setHasMore(result.hasMore);
      } catch {
        if (loadSequence.current === sequence) {
          setError(t("admin.notify.common.loadFailed"));
        }
      } finally {
        if (loadSequence.current === sequence) {
          setLoading(false);
        }
      }
    },
    [admin, channel, debouncedKeyword, statusFilter, t],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const variables = useMemo(() => extractTemplateVariables(form.content), [form.content]);
  const errors = useMemo(
    () => validateTemplateForm(channel, mode === "create" ? "create" : "edit", form),
    [channel, form, mode],
  );
  const dirty = mode !== "idle" && baseline !== templateFormSignature(form);
  const hasErrors = Object.keys(errors).length > 0;

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const requestDiscard = useCallback(
    (after: () => void) => {
      if (!dirty) {
        after();
        return;
      }
      setConfirmation({
        title: t("admin.notify.templates.discardTitle"),
        description: t("admin.notify.templates.discardConfirm"),
        confirmLabel: t("admin.notify.templates.discardAction"),
        tone: "default",
        action: after,
      });
    },
    [dirty, t],
  );

  const applySelection = (item: MessagingTemplate) => {
    const nextForm = formFromTemplate(item);
    setMode("edit");
    setEditingTemplate(item);
    setSelectedId(item.id);
    setEditorSession((current) => current + 1);
    setForm(nextForm);
    setBaseline(templateFormSignature(nextForm));
    setSamples({});
    setShowValidation(false);
    setNotice(null);
    setError(null);
  };

  const selectTemplate = (item: MessagingTemplate) => {
    if (item.id === selectedId) {
      return;
    }
    requestDiscard(() => applySelection(item));
  };

  const openCreateEditor = () => {
    const nextForm = emptyTemplateForm(channel);
    setMode("create");
    setEditingTemplate(null);
    setSelectedId(null);
    setEditorSession((current) => current + 1);
    setForm(nextForm);
    setBaseline(templateFormSignature(nextForm));
    setSamples({});
    setShowValidation(false);
    setNotice(null);
    setError(null);
  };

  const beginCreate = () => {
    requestDiscard(openCreateEditor);
  };

  const closeEditor = () => {
    requestDiscard(() => {
      setMode("idle");
      setEditingTemplate(null);
      setSelectedId(null);
      setShowValidation(false);
    });
  };

  const updateForm = (patch: Partial<TemplateFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const updateSample = (variable: string, value: string) => {
    setSamples((current) => ({ ...current, [variable]: value }));
  };

  const save = async () => {
    if (mode === "idle" || (mode === "edit" && !editingTemplate)) {
      return;
    }
    if (mode === "edit" && !dirty) {
      return;
    }
    setShowValidation(true);
    if (hasErrors) {
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const saveVariables = extractTemplateVariables(form.content);
    const base = {
      name: form.name.trim(),
      subject: channel === "email" ? form.subject.trim() : undefined,
      content: form.content,
      variables: saveVariables,
      status: form.status,
      approvalStatus:
        channel === "sms"
          ? (form.approvalStatus as MessagingTemplateApprovalStatus)
          : undefined,
      approvalNote: channel === "sms" ? form.approvalNote.trim() : undefined,
    };
    try {
      const saved =
        mode === "create"
          ? await admin.createTemplate({
              ...base,
              channel,
              templateCode: form.templateCode.trim(),
            })
          : await admin.updateTemplate(editingTemplate!.id, {
              ...base,
              expectedVersion: editingTemplate!.version,
            });
      const nextForm = formFromTemplate(saved);
      setMode("edit");
      setEditingTemplate(saved);
      setSelectedId(saved.id);
      setEditorSession((current) => current + 1);
      setForm(nextForm);
      setBaseline(templateFormSignature(nextForm));
      setSamples({});
      setShowValidation(false);
      setNotice(t("admin.notify.templates.saveSuccess"));
      await load(mode === "create" ? 1 : page);
    } catch (caught) {
      if (isConflictError(caught)) {
        if (mode === "create") {
          setError(t("admin.notify.templates.validation.codeTaken"));
        } else {
          // Someone else saved first: keep the operator's edits, refresh the
          // optimistic-concurrency token so the next save can land.
          try {
            const latest = await admin.retrieveTemplate(editingTemplate!.id);
            setEditingTemplate(latest);
          } catch {
            // The row may be gone; the list refresh below makes that visible.
          }
          await load(page);
          setError(t("admin.notify.common.conflict"));
        }
      } else if ((caught as { httpStatus?: unknown }).httpStatus === 404) {
        setMode("idle");
        setEditingTemplate(null);
        setSelectedId(null);
        await load(page);
        setError(t("admin.notify.templates.notFound"));
      } else {
        setError(t("admin.notify.common.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (template: MessagingTemplate) => {
    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      await admin.deleteTemplate(template.id);
      setMode("idle");
      setEditingTemplate(null);
      setSelectedId(null);
      setShowValidation(false);
      setNotice(t("admin.notify.templates.deleteSuccess"));
      await load(page > 1 && items.length === 1 ? page - 1 : page);
    } catch {
      setError(t("admin.notify.common.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const requestDelete = () => {
    const template = editingTemplate;
    if (!template) {
      return;
    }
    setConfirmation({
      title: t("admin.notify.templates.deleteTitle"),
      description: t("admin.notify.templates.deleteConfirm", { name: template.name }),
      confirmLabel: t("admin.notify.common.delete"),
      tone: "danger",
      action: () => void performDelete(template),
    });
  };

  const duplicateCurrent = () => {
    requestDiscard(() => {
      const nextForm: TemplateFormState = {
        ...form,
        templateCode: `${form.templateCode.trim()}_copy`,
        name: `${form.name.trim()} ${t("admin.notify.templates.duplicateSuffix")}`.trim(),
        status: "draft",
        approvalStatus: channel === "sms" ? "pending" : "not_applicable",
        approvalNote: "",
      };
      setMode("create");
      setEditingTemplate(null);
      setSelectedId(null);
      setEditorSession((current) => current + 1);
      setForm(nextForm);
      setBaseline(templateFormSignature(nextForm));
      setSamples({});
      setShowValidation(false);
      setNotice(null);
      setError(null);
    });
  };

  const headerTitle =
    channel === "email"
      ? t("admin.notify.emailTemplates.title")
      : t("admin.notify.smsTemplates.title");
  const headerDescription =
    channel === "email"
      ? t("admin.notify.emailTemplates.description")
      : t("admin.notify.smsTemplates.description");

  return (
    <PageErrorBoundary>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            className="min-w-0"
            title={headerTitle}
            description={headerDescription}
          />
          <PrimaryButton onClick={beginCreate}>
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("admin.notify.templates.create")}
            </span>
          </PrimaryButton>
        </div>

        {error ? <ErrorState message={error} onRetry={() => void load(page)} /> : null}
        {notice ? (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {notice}
            </span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label={t("admin.notify.common.close")}
              className="rounded p-0.5 text-emerald-600 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:flex-row">
          <div className="flex min-h-0 w-full shrink-0 flex-col max-lg:h-[44vh] lg:w-auto">
            <TemplateListPanel
              items={items}
              totalItems={totalItems}
              page={page}
              totalPages={totalPages}
              hasMore={hasMore}
              loading={loading}
              keyword={keyword}
              statusFilter={statusFilter}
              selectedId={selectedId}
              onKeywordChange={setKeyword}
              onStatusFilterChange={setStatusFilter}
              onSelect={selectTemplate}
              onRefresh={() => void load(page)}
              onPageChange={(targetPage) => void load(targetPage)}
            />
          </div>

          {mode === "idle" ? (
            <section className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 px-8 py-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <span className="rounded-2xl bg-slate-100 p-3 text-slate-400 dark:bg-white/10 dark:text-slate-500">
                {channel === "email" ? (
                  <Mail className="h-7 w-7" />
                ) : (
                  <MessageSquareText className="h-7 w-7" />
                )}
              </span>
              <h2 className="text-base font-semibold text-slate-800 dark:text-white">
                {t("admin.notify.templates.selectTitle")}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {t("admin.notify.templates.selectDescription")}
              </p>
            </section>
          ) : (
            <TemplateEditorPanel
              channel={channel}
              mode={mode === "create" ? "create" : "edit"}
              templateKey={`${channel}-${editorSession}`}
              form={form}
              variables={variables}
              samples={samples}
              errors={errors}
              showValidation={showValidation}
              dirty={dirty}
              saving={saving}
              deleting={deleting}
              onChange={updateForm}
              onSampleChange={updateSample}
              onSave={() => void save()}
              onCancel={closeEditor}
              onDelete={mode === "edit" ? requestDelete : undefined}
              onDuplicate={mode === "edit" ? duplicateCurrent : undefined}
            />
          )}
        </div>

        <ConfirmDialog
          open={confirmation !== null}
          title={confirmation?.title ?? ""}
          description={confirmation?.description ?? ""}
          confirmLabel={confirmation?.confirmLabel ?? ""}
          cancelLabel={t("admin.notify.common.cancel")}
          tone={confirmation?.tone ?? "default"}
          busy={deleting}
          onConfirm={() => {
            const action = confirmation?.action;
            setConfirmation(null);
            action?.();
          }}
          onCancel={() => setConfirmation(null)}
        />
      </div>
    </PageErrorBoundary>
  );
}
