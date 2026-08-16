import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";

import {
  ActionBar,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  StatusPill,
  TextAreaInput,
  TextInput,
} from "../components/form";
import {
  createNotifyAdminService,
  extractTemplateVariables,
  type MessagingTemplateStatus,
  type NotifyAdminService,
} from "../notifyAdminService";
import type { MessagingTemplate } from "@sdkwork/messaging-backend-sdk";

export interface SdkworkMessagingTemplateListPageProps {
  channel: "email" | "sms";
  service?: NotifyAdminService;
}

const STATUS_OPTIONS = [
  { value: "", label: "all" },
  { value: "draft", label: "draft" },
  { value: "active", label: "active" },
  { value: "disabled", label: "disabled" },
] as const;

const PAGE_SIZE = 20;

interface TemplateFormState {
  templateCode: string;
  name: string;
  subject: string;
  content: string;
  status: string;
}

const EMPTY_FORM: TemplateFormState = {
  templateCode: "",
  name: "",
  subject: "",
  content: "",
  status: "draft",
};

export function TemplateListPage({ channel, service }: SdkworkMessagingTemplateListPageProps) {
  const { t } = useTranslation();
  const admin = service ?? createNotifyAdminService();
  const [items, setItems] = useState<MessagingTemplate[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MessagingTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [variables, setVariables] = useState<string[]>([]);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await admin.listTemplates({
          channel,
          status: (statusFilter || undefined) as MessagingTemplateStatus | undefined,
          keyword: keyword.trim() || undefined,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        setItems(result.items);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setHasMore(result.hasMore);
      } catch {
        setError(t("admin.notify.common.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [admin, channel, keyword, statusFilter, t],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const beginCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setVariables([]);
  };

  const beginEdit = (item: MessagingTemplate) => {
    setEditing(item);
    setForm({
      templateCode: item.templateCode,
      name: item.name,
      subject: item.subject ?? "",
      content: item.content,
      status: item.status,
    });
    setVariables(item.variables ?? []);
  };

  const updateContent = (content: string) => {
    setForm((current) => ({ ...current, content }));
    setVariables(extractTemplateVariables(content));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const base = {
        name: form.name,
        subject: channel === "email" ? form.subject : undefined,
        content: form.content,
        variables: variables.length > 0 ? variables : undefined,
        status: form.status as MessagingTemplateStatus,
      };
      if (editing) {
        await admin.updateTemplate(editing.id, base);
      } else {
        await admin.createTemplate({
          ...base,
          channel,
          templateCode: form.templateCode,
        });
      }
      await load(page);
      setEditing(null);
    } catch {
      setError(t("admin.notify.common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: MessagingTemplate) => {
    setError(null);
    try {
      await admin.deleteTemplate(item.id);
      await load(page > 1 && items.length === 1 ? page - 1 : page);
    } catch {
      setError(t("admin.notify.common.deleteFailed"));
    }
  };

  const panelOpen = editing !== null || form.templateCode !== "" || form.name !== "" || form.content !== "";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={
          channel === "email"
            ? t("admin.notify.emailTemplates.title")
            : t("admin.notify.smsTemplates.title")
        }
        description={
          channel === "email"
            ? t("admin.notify.emailTemplates.description")
            : t("admin.notify.smsTemplates.description")
        }
      />
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("admin.notify.templates.searchPlaceholder")}
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
          />
        </div>
        <SelectInput
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label:
              option.value === "" ? t("admin.notify.templates.allStatus") : t(`admin.notify.status.${option.value}`),
          }))}
        />
        <PrimaryButton onClick={beginCreate}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("admin.notify.templates.create")}
          </span>
        </PrimaryButton>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {loading ? (
        <LoadingState label={t("admin.notify.common.loading")} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("admin.notify.templates.code")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.notify.templates.name")}</th>
                {channel === "email" ? (
                  <th className="px-4 py-3 font-medium">{t("admin.notify.templates.subject")}</th>
                ) : null}
                <th className="px-4 py-3 font-medium">{t("admin.notify.templates.variables")}</th>
                {channel === "sms" ? (
                  <th className="px-4 py-3 font-medium">{t("admin.notify.templates.approval")}</th>
                ) : null}
                <th className="px-4 py-3 font-medium">{t("admin.notify.templates.status")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("admin.notify.templates.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.templateCode}</td>
                  <td className="px-4 py-3 text-slate-800">{item.name}</td>
                  {channel === "email" ? (
                    <td className="max-w-[220px] truncate px-4 py-3 text-slate-500">{item.subject ?? "—"}</td>
                  ) : null}
                  <td className="px-4 py-3 text-slate-500">
                    {(item.variables ?? []).length > 0 ? (
                      <span className="font-mono text-xs">{item.variables!.join(", ")}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  {channel === "sms" ? (
                    <td className="px-4 py-3">
                      <StatusPill status={item.approvalStatus} />
                      {item.approvalNote ? (
                        <span className="ml-2 text-xs text-slate-400">{item.approvalNote}</span>
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => beginEdit(item)}
                      className="mr-2 inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-sky-600 hover:bg-sky-50"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      {t("admin.notify.common.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("admin.notify.common.delete")}
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={channel === "email" ? 6 : 6} className="px-4 py-10 text-center text-slate-400">
                    {t("admin.notify.templates.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          {t("admin.notify.templates.page")} {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => void load(page - 1)} disabled={page <= 1}>
            {t("admin.notify.common.previous")}
          </SecondaryButton>
          <SecondaryButton onClick={() => void load(page + 1)} disabled={!hasMore}>
            {t("admin.notify.common.next")}
          </SecondaryButton>
        </div>
      </div>

      {panelOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">
                {editing
                  ? t("admin.notify.templates.editTitle")
                  : t("admin.notify.templates.createTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {editing ? null : (
                <Field label={t("admin.notify.templates.code")} hint={t("admin.notify.templates.codeHint")}>
                  <TextInput
                    value={form.templateCode}
                    onChange={(value) => setForm((current) => ({ ...current, templateCode: value }))}
                  />
                </Field>
              )}
              <Field label={t("admin.notify.templates.name")}>
                <TextInput value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
              </Field>
              {channel === "email" ? (
                <Field label={t("admin.notify.templates.subject")}>
                  <TextInput value={form.subject} onChange={(value) => setForm((current) => ({ ...current, subject: value }))} />
                </Field>
              ) : null}
              <Field
                label={t("admin.notify.templates.content")}
                hint={t("admin.notify.templates.variableHint")}
              >
                <TextAreaInput value={form.content} onChange={updateContent} rows={10} />
              </Field>
              {variables.length > 0 ? (
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">
                    {t("admin.notify.templates.detectedVariables")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variables.map((variable) => (
                      <span key={variable} className="rounded bg-sky-50 px-2 py-1 font-mono text-xs text-sky-700">
                        {"{{"}{variable}{"}}"}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <Field label={t("admin.notify.templates.status")}>
                <SelectInput
                  value={form.status}
                  onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                  options={STATUS_OPTIONS.slice(1).map((option) => ({
                    value: option.value,
                    label: t(`admin.notify.status.${option.value}`),
                  }))}
                />
              </Field>
            </div>
            <div className="border-t border-slate-200 px-6 py-4">
              <ActionBar>
                <SecondaryButton onClick={() => setEditing(null)}>
                  {t("admin.notify.common.cancel")}
                </SecondaryButton>
                <PrimaryButton onClick={() => void save()} disabled={saving}>
                  {saving ? t("admin.notify.common.saving") : t("admin.notify.common.save")}
                </PrimaryButton>
              </ActionBar>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
