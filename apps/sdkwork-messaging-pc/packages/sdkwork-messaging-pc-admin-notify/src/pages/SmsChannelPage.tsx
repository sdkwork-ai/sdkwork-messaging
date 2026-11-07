import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  KeyRound,
  MessageSquareText,
  Plus,
  Route,
  Trash2,
} from "lucide-react";

import {
  ActionBar,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  TextInput,
  ToggleInput,
  inputClass,
} from "../components/form";
import { SlideOver } from "../components/slide-over";
import { ListPager } from "../components/list-pager";
import { PageErrorBoundary } from "../components/page-error-boundary";
import {
  NOTIFY_PAGE_SIZE as PAGE_SIZE,
  usePagedList,
} from "../components/use-paged-list";
import {
  SMS_PROVIDER_CATALOG,
  SMS_SEND_SCENARIOS,
  smsProviderCatalogEntry,
} from "../smsProviderCatalog";
import {
  defaultNotifyAdminService,
  isConflictError,
  type MessagingEmailSendScenario,
  type MessagingSmsAccount,
  type MessagingSmsProvider,
  type MessagingSmsSendRule,
  type MessagingSmsSignature,
  type NotifyAdminService,
} from "../notifyAdminService";

export interface SdkworkMessagingSmsChannelPageProps {
  service?: NotifyAdminService;
}

type SmsTab = "accounts" | "signatures" | "rules";

const SMS_TABS: readonly { id: SmsTab; labelKey: string }[] = [
  { id: "accounts", labelKey: "admin.notify.sms.tab.accounts" },
  { id: "signatures", labelKey: "admin.notify.sms.tab.signatures" },
  { id: "rules", labelKey: "admin.notify.sms.tab.rules" },
];

function readConfig(config: Record<string, unknown> | undefined, key: string): string {
  const value = config?.[key];
  return typeof value === "string" ? value : "";
}

function ProviderBadge({ provider }: { provider: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
      <MessageSquareText className="h-3 w-3" />
      {t(`admin.notify.smsProviders.${provider}.name`, provider)}
    </span>
  );
}

interface AccountFormState {
  name: string;
  fields: Record<string, string>;
  secret: string;
  enabled: boolean;
}

function emptyAccountForm(entry: (typeof SMS_PROVIDER_CATALOG)[number]): AccountFormState {
  const fields: Record<string, string> = {};
  for (const field of entry.fields) {
    fields[field.key] = field.preset ?? "";
  }
  return { name: "", fields, secret: "", enabled: true };
}

function accountFormFromItem(
  account: MessagingSmsAccount,
  entry: (typeof SMS_PROVIDER_CATALOG)[number],
): AccountFormState {
  const fields: Record<string, string> = {};
  for (const field of entry.fields) {
    fields[field.key] = readConfig(account.config, field.key) || field.preset || "";
  }
  return { name: account.name, fields, secret: "", enabled: account.enabled };
}

function accountConfigFromForm(
  form: AccountFormState,
  entry: (typeof SMS_PROVIDER_CATALOG)[number],
): Record<string, string> {
  const config: Record<string, string> = {};
  for (const field of entry.fields) {
    const value = (form.fields[field.key] ?? "").trim();
    if (value) {
      config[field.key] = value;
    }
  }
  return config;
}

// --------------------------------------------------------------- accounts tab

function AccountsPanel({ admin }: { admin: NotifyAdminService }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editing, setEditing] = useState<MessagingSmsAccount | null>(null);
  const [pickedProvider, setPickedProvider] = useState<MessagingSmsProvider | null>(null);
  const [form, setForm] = useState<AccountFormState | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const result = await admin.listSmsAccounts({ page: targetPage, pageSize: PAGE_SIZE });
      return {
        items: result.items,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      };
    },
    [admin],
  );

  const {
    items: accounts,
    page,
    pageMeta,
    load,
    reload,
  } = usePagedList<MessagingSmsAccount>(fetchPage);

  const runLoad = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        await load(targetPage);
      } catch {
        setError(t("admin.notify.common.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [load, t],
  );

  useEffect(() => {
    void runLoad(1);
  }, [runLoad]);

  const closeDrawer = () => {
    setCatalogOpen(false);
    setEditing(null);
    setPickedProvider(null);
    setForm(null);
  };

  const beginCreate = () => {
    setEditing(null);
    setPickedProvider(null);
    setForm(null);
    setCatalogOpen(true);
  };

  const pickProvider = (provider: MessagingSmsProvider) => {
    const entry = smsProviderCatalogEntry(provider);
    if (!entry) {
      return;
    }
    setPickedProvider(provider);
    setForm(emptyAccountForm(entry));
  };

  const beginEdit = (account: MessagingSmsAccount) => {
    const entry = smsProviderCatalogEntry(account.provider);
    if (!entry) {
      return;
    }
    setEditing(account);
    setPickedProvider(account.provider as MessagingSmsProvider);
    setForm(accountFormFromItem(account, entry));
    setCatalogOpen(true);
  };

  const save = async () => {
    if (!form || !pickedProvider) {
      return;
    }
    const entry = smsProviderCatalogEntry(pickedProvider);
    if (!entry) {
      return;
    }
    const name = form.name.trim();
    if (!name) {
      setError(t("admin.notify.sms.nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const config = accountConfigFromForm(form, entry);
      if (editing) {
        await admin.updateSmsAccount(editing.id, {
          name,
          provider: pickedProvider,
          config,
          ...(form.secret.trim() ? { secret: form.secret } : {}),
          enabled: form.enabled,
          expectedVersion: editing.version,
        });
      } else {
        await admin.createSmsAccount({
          name,
          provider: pickedProvider,
          config,
          ...(form.secret.trim() ? { secret: form.secret } : {}),
          enabled: form.enabled,
        });
      }
      closeDrawer();
      setNotice(t("admin.notify.common.saved"));
      await reload();
    } catch (error) {
      if (isConflictError(error)) {
        closeDrawer();
        setError(t("admin.notify.common.conflict"));
        await reload();
      } else {
        setError(t("admin.notify.common.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleAccount = async (account: MessagingSmsAccount, enabled: boolean) => {
    setError(null);
    setNotice(null);
    try {
      await admin.updateSmsAccount(account.id, {
        name: account.name,
        provider: account.provider as MessagingSmsProvider,
        config: account.config as Record<string, string>,
        enabled,
        expectedVersion: account.version,
      });
      setNotice(t("admin.notify.common.saved"));
      await reload();
    } catch (error) {
      if (isConflictError(error)) {
        setError(t("admin.notify.common.conflict"));
        await reload();
      } else {
        setError(t("admin.notify.common.saveFailed"));
      }
    }
  };

  const removeAccount = async (account: MessagingSmsAccount) => {
    if (!window.confirm(t("admin.notify.sms.deleteConfirm", { name: account.name }))) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await admin.deleteSmsAccount(account.id);
      setNotice(t("admin.notify.common.deleted"));
      await reload();
    } catch (error) {
      if (isConflictError(error)) {
        setError(t("admin.notify.common.conflict"));
        await reload();
      } else {
        setError(t("admin.notify.sms.deleteFailed"));
      }
    }
  };

  const drawerEntry = pickedProvider ? smsProviderCatalogEntry(pickedProvider) : undefined;

  return (
    <section className="flex min-h-0 w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("admin.notify.sms.accountsHint")}
        </p>
        <PrimaryButton onClick={beginCreate}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("admin.notify.sms.addProvider")}
          </span>
        </PrimaryButton>
      </div>
      {error ? <ErrorState message={error} onRetry={() => void runLoad(page)} /> : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}
      {loading ? (
        <LoadingState label={t("admin.notify.common.loading")} />
      ) : accounts.length === 0 && page === 1 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-400 dark:border-white/10 dark:text-slate-500">
          {t("admin.notify.sms.accountsEmpty")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {accounts.map((account) => (
              <article
                key={account.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                      {account.name}
                    </h3>
                    <div className="mt-1.5">
                      <ProviderBadge provider={account.provider} />
                    </div>
                  </div>
                  <ToggleInput
                    checked={account.enabled}
                    onChange={(value) => void toggleAccount(account, value)}
                  />
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {account.config && Object.keys(account.config).length > 0
                    ? Object.entries(account.config)
                        .filter(([, value]) => typeof value === "string" && value)
                        .slice(0, 3)
                        .map(([key, value]) => (
                          <div key={key} className="col-span-2 flex min-w-0 gap-2">
                            <dt className="shrink-0 font-medium">{key}</dt>
                            <dd className="truncate font-mono">{String(value)}</dd>
                          </div>
                        ))
                    : null}
                </dl>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-white/5 dark:text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    {account.hasSecret ? (
                      <>
                        <KeyRound className="h-3.5 w-3.5" />
                        {account.keyDisplayMasked}
                      </>
                    ) : (
                      t("admin.notify.common.secretEmptyHint")
                    )}
                  </span>
                  <span>
                    {account.updatedAt ? new Date(account.updatedAt).toLocaleString() : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => beginEdit(account)}
                    className="rounded px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
                  >
                    {t("admin.notify.common.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeAccount(account)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("admin.notify.common.delete")}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <ListPager
            page={page}
            totalPages={pageMeta.totalPages}
            hasMore={pageMeta.hasMore}
            onPrev={() => void runLoad(page - 1)}
            onNext={() => void runLoad(page + 1)}
          />
        </>
      )}

      {catalogOpen ? (
        <SlideOver
          title={
            editing
              ? t("admin.notify.sms.editAccountTitle")
              : pickedProvider
                ? t("admin.notify.sms.createAccountTitle")
                : t("admin.notify.sms.addProvider")
          }
          onClose={closeDrawer}
          footer={
            pickedProvider && form ? (
              <ActionBar>
                <SecondaryButton onClick={closeDrawer}>
                  {t("admin.notify.common.cancel")}
                </SecondaryButton>
                <PrimaryButton onClick={() => void save()} disabled={saving}>
                  {saving ? t("admin.notify.common.saving") : t("admin.notify.common.save")}
                </PrimaryButton>
              </ActionBar>
            ) : null
          }
        >
          {!pickedProvider ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SMS_PROVIDER_CATALOG.map((entry) => (
                <button
                  key={entry.provider}
                  type="button"
                  onClick={() => pickProvider(entry.provider)}
                  className="flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50/60 dark:border-white/10 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/5"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                    <Building2 className="h-4 w-4 text-emerald-500" />
                    {t(entry.nameKey)}
                  </span>
                  <span className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {t(entry.descriptionKey)}
                  </span>
                </button>
              ))}
            </div>
          ) : form && drawerEntry ? (
            <div className="space-y-5">
              <Field label={t("admin.notify.sms.name")} hint={t("admin.notify.sms.nameHint")}>
                <TextInput
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                  placeholder={t(drawerEntry.nameKey)}
                />
              </Field>
              {drawerEntry.fields.map((field) => (
                <Field key={field.key} label={t(field.labelKey)}>
                  <TextInput
                    value={form.fields[field.key] ?? ""}
                    onChange={(value) =>
                      setForm({ ...form, fields: { ...form.fields, [field.key]: value } })
                    }
                    placeholder={field.placeholderKey ? t(field.placeholderKey) : field.preset}
                  />
                </Field>
              ))}
              <Field
                label={t(drawerEntry.secretLabelKey)}
                hint={
                  editing?.hasSecret
                    ? t("admin.notify.common.secretConfiguredHint")
                    : t("admin.notify.common.secretEmptyHint")
                }
              >
                <div className="relative">
                  <TextInput
                    type="password"
                    value={form.secret}
                    onChange={(value) => setForm({ ...form, secret: value })}
                    placeholder={editing?.hasSecret ? "********" : ""}
                  />
                  {editing?.hasSecret ? (
                    <KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  ) : null}
                </div>
              </Field>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-white/5">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t("admin.notify.common.enabled")}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t("admin.notify.sms.enabledHint")}
                  </p>
                </div>
                <ToggleInput
                  checked={form.enabled}
                  onChange={(value) => setForm({ ...form, enabled: value })}
                />
              </div>
            </div>
          ) : null}
        </SlideOver>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------ signatures tab

interface SignatureFormState {
  accountId: string;
  signName: string;
  enabled: boolean;
}

function SignaturesPanel({ admin }: { admin: NotifyAdminService }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<MessagingSmsSignature | null>(null);
  const [form, setForm] = useState<SignatureFormState>({
    accountId: "",
    signName: "",
    enabled: true,
  });

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const result = await admin.listSmsSignatures({ page: targetPage, pageSize: PAGE_SIZE });
      return {
        items: result.items,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      };
    },
    [admin],
  );

  const {
    items: signatures,
    page,
    pageMeta,
    load,
    reload,
  } = usePagedList<MessagingSmsSignature>(fetchPage);
  const [accounts, setAccounts] = useState<MessagingSmsAccount[]>([]);

  const runLoad = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const [signaturePage, accountPage] = await Promise.all([
          load(targetPage),
          admin.listSmsAccounts({ page: 1, pageSize: PAGE_SIZE }),
        ]);
        setAccounts(accountPage.items);
        return signaturePage;
      } catch {
        setError(t("admin.notify.common.loadFailed"));
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [admin, load, t],
  );

  useEffect(() => {
    void runLoad(1);
  }, [runLoad]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const beginCreate = () => {
    setEditing(null);
    setForm({
      accountId: accounts[0]?.id ?? "",
      signName: "",
      enabled: true,
    });
    setDrawerOpen(true);
  };

  const beginEdit = (signature: MessagingSmsSignature) => {
    setEditing(signature);
    setForm({
      accountId: signature.accountId,
      signName: signature.signName,
      enabled: signature.enabled,
    });
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (editing) {
        await admin.updateSmsSignature(editing.id, {
          signName: form.signName.trim(),
          enabled: form.enabled,
          expectedVersion: editing.version,
        });
      } else {
        await admin.createSmsSignature({
          accountId: form.accountId,
          signName: form.signName.trim(),
          enabled: form.enabled,
        });
      }
      closeDrawer();
      setNotice(t("admin.notify.common.saved"));
      await reload();
    } catch (error) {
      if (isConflictError(error)) {
        closeDrawer();
        setError(t("admin.notify.common.conflict"));
        await reload();
      } else {
        setError(t("admin.notify.common.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleSignature = async (signature: MessagingSmsSignature, enabled: boolean) => {
    setError(null);
    setNotice(null);
    try {
      await admin.updateSmsSignature(signature.id, {
        signName: signature.signName,
        enabled,
        expectedVersion: signature.version,
      });
      setNotice(t("admin.notify.common.saved"));
      await reload();
    } catch (error) {
      if (isConflictError(error)) {
        setError(t("admin.notify.common.conflict"));
        await reload();
      } else {
        setError(t("admin.notify.common.saveFailed"));
      }
    }
  };

  const removeSignature = async (signature: MessagingSmsSignature) => {
    if (!window.confirm(t("admin.notify.signatures.deleteConfirm", { name: signature.signName }))) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await admin.deleteSmsSignature(signature.id);
      setNotice(t("admin.notify.common.deleted"));
      await reload();
    } catch (error) {
      if (isConflictError(error)) {
        setError(t("admin.notify.common.conflict"));
        await reload();
      } else {
        setError(t("admin.notify.signatures.deleteFailed"));
      }
    }
  };

  return (
    <section className="flex min-h-0 w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("admin.notify.sms.signaturesHint")}
        </p>
        <PrimaryButton onClick={beginCreate} disabled={accounts.length === 0}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("admin.notify.signatures.addSignature")}
          </span>
        </PrimaryButton>
      </div>
      {accounts.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t("admin.notify.signatures.noAccountsHint")}
        </div>
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void runLoad(page)} /> : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}
      {loading ? (
        <LoadingState label={t("admin.notify.common.loading")} />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("admin.notify.signatures.signName")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.notify.signatures.account")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.notify.common.enabled")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.notify.templates.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {signatures.map((signature) => (
                  <tr
                    key={signature.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-100">
                      {signature.signName}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {signature.accountName}
                    </td>
                    <td className="px-4 py-3">
                      <ToggleInput
                        checked={signature.enabled}
                        onChange={(value) => void toggleSignature(signature, value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => beginEdit(signature)}
                        className="mr-2 rounded px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
                      >
                        {t("admin.notify.common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeSignature(signature)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("admin.notify.common.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
                {signatures.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                      {t("admin.notify.signatures.empty")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <ListPager
            page={page}
            totalPages={pageMeta.totalPages}
            hasMore={pageMeta.hasMore}
            onPrev={() => void runLoad(page - 1)}
            onNext={() => void runLoad(page + 1)}
          />
        </>
      )}

      {drawerOpen ? (
        <SlideOver
          title={
            editing
              ? t("admin.notify.signatures.editTitle")
              : t("admin.notify.signatures.createTitle")
          }
          onClose={closeDrawer}
          footer={
            <ActionBar>
              <SecondaryButton onClick={closeDrawer}>
                {t("admin.notify.common.cancel")}
              </SecondaryButton>
              <PrimaryButton onClick={() => void save()} disabled={saving}>
                {saving ? t("admin.notify.common.saving") : t("admin.notify.common.save")}
              </PrimaryButton>
            </ActionBar>
          }
        >
          <div className="space-y-5">
            <Field label={t("admin.notify.signatures.account")}>
              <SelectInput
                value={form.accountId}
                onChange={(value) => setForm({ ...form, accountId: value })}
                disabled={Boolean(editing)}
                options={accounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} · ${t(`admin.notify.smsProviders.${account.provider}.name`, account.provider)}`,
                }))}
              />
            </Field>
            <Field
              label={t("admin.notify.signatures.signName")}
              hint={t("admin.notify.signatures.signNameHint")}
            >
              <TextInput
                value={form.signName}
                onChange={(value) => setForm({ ...form, signName: value })}
                placeholder="XX科技"
              />
            </Field>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-white/5">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t("admin.notify.common.enabled")}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t("admin.notify.signatures.enabledHint")}
                </p>
              </div>
              <ToggleInput
                checked={form.enabled}
                onChange={(value) => setForm({ ...form, enabled: value })}
              />
            </div>
          </div>
        </SlideOver>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------- rules tab

function RulesPanel({ admin }: { admin: NotifyAdminService }) {
  const { t } = useTranslation();
  const [signatures, setSignatures] = useState<MessagingSmsSignature[]>([]);
  const [chains, setChains] = useState<Record<string, string[]>>({});
  const [ruleVersions, setRuleVersions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingScenario, setSavingScenario] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ruleItems, signaturePage] = await Promise.all([
      admin.listSmsSendRules(),
      admin.listSmsSignatures({ page: 1, pageSize: 100 }),
    ]);
    setSignatures(signaturePage.items);
    const nextChains: Record<string, string[]> = {};
    const nextVersions: Record<string, string> = {};
    for (const rule of ruleItems) {
      nextChains[rule.scenario] = rule.chain.map((step) => step.signatureId);
      nextVersions[rule.scenario] = rule.version;
    }
    setChains(nextChains);
    setRuleVersions(nextVersions);
  }, [admin]);

  const runLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await load();
    } catch {
      setError(t("admin.notify.common.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [load, t]);

  useEffect(() => {
    void runLoad();
  }, [runLoad]);

  const signatureById = useMemo(() => {
    const index = new Map<string, MessagingSmsSignature>();
    for (const signature of signatures) {
      index.set(signature.id, signature);
    }
    return index;
  }, [signatures]);

  const setChain = (scenario: MessagingEmailSendScenario, signatureIds: string[]) => {
    setChains((current) => ({ ...current, [scenario]: signatureIds }));
  };

  const moveStep = (scenario: MessagingEmailSendScenario, index: number, offset: -1 | 1) => {
    const chain = [...(chains[scenario] ?? [])];
    const target = index + offset;
    if (target < 0 || target >= chain.length) {
      return;
    }
    [chain[index], chain[target]] = [chain[target], chain[index]];
    setChain(scenario, chain);
  };

  const saveScenario = async (scenario: MessagingEmailSendScenario) => {
    setSavingScenario(scenario);
    setError(null);
    setNotice(null);
    try {
      await admin.updateSmsSendRule(scenario, {
        signatureIds: chains[scenario] ?? [],
        enabled: true,
        expectedVersion: ruleVersions[scenario] ?? "0",
      });
      setNotice(t("admin.notify.common.saved"));
      await load();
    } catch (error) {
      if (isConflictError(error)) {
        setError(t("admin.notify.common.conflict"));
        await load();
      } else {
        setError(t("admin.notify.rules.saveFailed"));
      }
    } finally {
      setSavingScenario(null);
    }
  };

  if (loading) {
    return <LoadingState label={t("admin.notify.common.loading")} />;
  }

  return (
    <section className="flex min-h-0 w-full flex-col gap-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("admin.notify.sms.rulesHint")}
      </p>
      {error ? <ErrorState message={error} onRetry={() => void runLoad()} /> : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {SMS_SEND_SCENARIOS.map((scenario) => {
          const chain = chains[scenario] ?? [];
          const available = signatures.filter((signature) => !chain.includes(signature.id));
          return (
            <article
              key={scenario}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]"
            >
              <div>
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                  <Route className="h-4 w-4 text-emerald-500" />
                  {t(`admin.notify.rules.scenario.${scenario}`)}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t(`admin.notify.rules.scenario.${scenario}.description`)}
                </p>
              </div>
              <ol className="flex flex-col gap-2">
                {chain.map((signatureId, index) => {
                  const signature = signatureById.get(signatureId);
                  return (
                    <li
                      key={signatureId}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10"
                    >
                      <span className="w-5 shrink-0 text-center text-xs text-slate-400 dark:text-slate-500">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200">
                        {signature?.signName ?? signatureId}
                        {signature ? (
                          <span className="ml-2 text-slate-400 dark:text-slate-500">
                            {signature.accountName}
                          </span>
                        ) : null}
                      </span>
                      {signature && !signature.enabled ? (
                        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                          {t("admin.notify.rules.disabledSender")}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label="move up"
                        onClick={() => moveStep(scenario, index, -1)}
                        disabled={index === 0}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="move down"
                        onClick={() => moveStep(scenario, index, 1)}
                        disabled={index === chain.length - 1}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="remove"
                        onClick={() =>
                          setChain(
                            scenario,
                            chain.filter((id) => id !== signatureId),
                          )
                        }
                        className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
                {chain.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
                    {t("admin.notify.rules.chainEmpty")}
                  </li>
                ) : null}
              </ol>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value=""
                  disabled={available.length === 0}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value) {
                      setChain(scenario, [...chain, value]);
                    }
                  }}
                  className={`${inputClass} max-w-xs flex-1`}
                >
                  <option value="">{t("admin.notify.rules.addStep")}</option>
                  {available.map((signature) => (
                    <option key={signature.id} value={signature.id}>
                      {signature.signName} · {signature.accountName}
                    </option>
                  ))}
                </select>
                <PrimaryButton onClick={() => void saveScenario(scenario)} disabled={savingScenario === scenario}>
                  {savingScenario === scenario
                    ? t("admin.notify.common.saving")
                    : t("admin.notify.rules.saveScenario")}
                </PrimaryButton>
              </div>
            </article>
          );
        })}
      </div>
      {signatures.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t("admin.notify.rules.noSendersHint")}
        </div>
      ) : null}
    </section>
  );
}

// --------------------------------------------------------------------- page

export function SmsChannelPage({ service }: SdkworkMessagingSmsChannelPageProps) {
  const { t } = useTranslation();
  const admin = service ?? defaultNotifyAdminService;
  const [tab, setTab] = useState<SmsTab>("accounts");

  return (
    <PageErrorBoundary>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          title={t("admin.notify.sms.title")}
          description={t("admin.notify.sms.description")}
        />
        <div
          role="tablist"
          className="flex w-full min-w-0 gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-[#1a1a1a]"
        >
          {SMS_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-2 pr-0.5">
          {tab === "accounts" ? <AccountsPanel admin={admin} /> : null}
          {tab === "signatures" ? <SignaturesPanel admin={admin} /> : null}
          {tab === "rules" ? <RulesPanel admin={admin} /> : null}
        </div>
      </div>
    </PageErrorBoundary>
  );
}
