/**
 * Template ↔ provider bindings.
 *
 * One business template can be registered with many providers; each provider
 * owns its own external template id (SMS carriers and provider-hosted email
 * templates use different ids). The panel lists every registered provider,
 * exposes the provider-side id for edit, and offers one-click registration with
 * all providers of the channel.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleDashed, RefreshCw, Save } from "lucide-react";

import { ProviderLogo } from "../providerLogos";
import { emailProviderCatalogEntry } from "../emailProviderCatalog";
import { smsProviderCatalogEntry } from "../smsProviderCatalog";
import {
  defaultNotifyAdminService,
  type MessagingTemplateProviderBinding,
  type NotifyAdminService,
} from "../notifyAdminService";
import { ErrorState, Field, SecondaryButton, TextInput } from "./form";

export interface TemplateProviderBindingsProps {
  channel: "email" | "sms";
  templateId: string;
  service?: NotifyAdminService;
}

function providerLabel(channel: "email" | "sms", provider: string): string {
  return channel === "email"
    ? (emailProviderCatalogEntry(provider)?.nameKey ?? provider)
    : (smsProviderCatalogEntry(provider)?.nameKey ?? provider);
}

function syncStatusClass(status: string): string {
  switch (status) {
    case "synced":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "pending_approval":
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
    case "failed":
      return "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
  }
}

export function TemplateProviderBindings({
  channel,
  templateId,
  service,
}: TemplateProviderBindingsProps) {
  const { t } = useTranslation();
  const admin = service ?? defaultNotifyAdminService;
  const [bindings, setBindings] = useState<MessagingTemplateProviderBinding[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const applyBindings = useCallback((items: MessagingTemplateProviderBinding[]) => {
    setBindings(items);
    setDrafts(
      Object.fromEntries(
        items.map((item) => [item.provider, item.providerTemplateId ?? ""]),
      ),
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyBindings(await admin.listTemplateProviders(templateId));
    } catch {
      setError(t("admin.notify.templates.providers.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [admin, applyBindings, t, templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncAll = async () => {
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await admin.syncTemplateProviders(templateId);
      applyBindings(result.items);
      setNotice(
        result.pendingApproval > 0
          ? t("admin.notify.templates.providers.syncPending", {
              synced: result.synced,
              pending: result.pendingApproval,
            })
          : t("admin.notify.templates.providers.syncDone", { count: result.synced }),
      );
    } catch {
      setError(t("admin.notify.templates.providers.syncFailed"));
    } finally {
      setSyncing(false);
    }
  };

  const saveProvider = async (binding: MessagingTemplateProviderBinding) => {
    const providerTemplateId = (drafts[binding.provider] ?? "").trim();
    setSavingProvider(binding.provider);
    setError(null);
    setNotice(null);
    try {
      const updated = await admin.updateTemplateProvider(templateId, binding.provider, {
        ...(providerTemplateId ? { providerTemplateId } : {}),
        syncStatus: providerTemplateId ? "synced" : "pending_approval",
      });
      setBindings((current) =>
        current.map((item) => (item.provider === updated.provider ? updated : item)),
      );
      setDrafts((current) => ({
        ...current,
        [updated.provider]: updated.providerTemplateId ?? "",
      }));
      setNotice(
        t("admin.notify.templates.providers.saveDone", {
          provider: t(providerLabel(channel, binding.provider), binding.provider),
        }),
      );
    } catch {
      setError(t("admin.notify.templates.providers.saveFailed"));
    } finally {
      setSavingProvider(null);
    }
  };

  const rows = useMemo(
    () =>
      bindings.map((binding) => {
        const label = t(providerLabel(channel, binding.provider), binding.provider);
        return { binding, label };
      }),
    [bindings, channel, t],
  );

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            {t("admin.notify.templates.providers.title")}
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            {t("admin.notify.templates.providers.hint")}
          </p>
        </div>
        <SecondaryButton onClick={() => void syncAll()} disabled={syncing || loading}>
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw className={syncing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            {syncing
              ? t("admin.notify.templates.providers.syncing")
              : t("admin.notify.templates.providers.syncAll")}
          </span>
        </SecondaryButton>
      </header>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <CircleDashed className="h-3.5 w-3.5 animate-spin" />
          {t("admin.notify.templates.providers.loading")}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t("admin.notify.templates.providers.empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ binding, label }) => (
            <div
              key={binding.provider}
              className="grid items-end gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] dark:border-white/10"
            >
              <div className="flex min-w-0 items-center gap-2">
                <ProviderLogo provider={binding.provider} label={label} size={30} />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-800 dark:text-white">
                    {label}
                  </div>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${syncStatusClass(binding.syncStatus)}`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {t(`admin.notify.templates.providers.status.${binding.syncStatus}`, binding.syncStatus)}
                  </span>
                </div>
              </div>
              <Field label={t("admin.notify.templates.providers.providerTemplateId")}>
                <TextInput
                  value={drafts[binding.provider] ?? ""}
                  onChange={(value) =>
                    setDrafts((current) => ({ ...current, [binding.provider]: value }))
                  }
                  placeholder={
                    channel === "email"
                      ? t("admin.notify.templates.providers.emailIdPlaceholder")
                      : t("admin.notify.templates.providers.smsIdPlaceholder")
                  }
                />
              </Field>
              <button
                type="button"
                disabled={savingProvider === binding.provider || syncing}
                onClick={() => void saveProvider(binding)}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                {savingProvider === binding.provider ? (
                  <CircleDashed className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {t("admin.notify.templates.providers.save")}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
