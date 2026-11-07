import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  KeyRound,
  Mail,
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
  EMAIL_PROVIDER_CATALOG,
  EMAIL_SEND_SCENARIOS,
  emailProviderCatalogEntry,
} from "../emailProviderCatalog";
import {
  defaultNotifyAdminService,
  isConflictError,
  type MessagingEmailAccount,
  type MessagingEmailProvider,
  type MessagingEmailSendRule,
  type MessagingEmailSendScenario,
  type MessagingEmailSender,
  type NotifyAdminService,
} from "../notifyAdminService";

export interface SdkworkMessagingEmailChannelPageProps {
  service?: NotifyAdminService;
}

type EmailTab = "accounts" | "senders" | "rules";

const EMAIL_TABS: readonly { id: EmailTab; labelKey: string }[] = [
  { id: "accounts", labelKey: "admin.notify.email.tab.accounts" },
  { id: "senders", labelKey: "admin.notify.email.tab.senders" },
  { id: "rules", labelKey: "admin.notify.email.tab.rules" },
];


function readConfig(config: Record<string, unknown> | undefined, key: string): string {
  const value = config?.[key];
  return typeof value === "string" ? value : "";
}

function ProviderBadge({ provider }: { provider: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
      <Mail className="h-3 w-3" />
      {t(`admin.notify.emailProviders.${provider}.name`, provider)}
    </span>
  );
}

interface AccountFormState {
  name: string;
  host: string;
  port: string;
  encryption: string;
  username: string;
  apiBaseUrl: string;
  region: string;
  secret: string;
  enabled: boolean;
}

function emptyAccountForm(entry: (typeof EMAIL_PROVIDER_CATALOG)[number]): AccountFormState {
  return {
    name: "",
    host: entry.configDefaults.host ?? "",
    port: entry.configDefaults.port ?? "",
    encryption: entry.configDefaults.encryption ?? "smtps",
    username: "",
    apiBaseUrl: entry.configDefaults.apiBaseUrl ?? "",
    region: entry.configDefaults.region ?? "",
    secret: "",
    enabled: true,
  };
}

function accountFormFromItem(account: MessagingEmailAccount): AccountFormState {
  return {
    name: account.name,
    host: readConfig(account.config, "host"),
    port: readConfig(account.config, "port") || "465",
    encryption: readConfig(account.config, "encryption") || "smtps",
    username: readConfig(account.config, "username"),
    apiBaseUrl: readConfig(account.config, "apiBaseUrl"),
    region: readConfig(account.config, "region"),
    secret: "",
    enabled: account.enabled,
  };
}

function accountConfigFromForm(
  form: AccountFormState,
  transport: "smtp" | "http_api",
): Record<string, string> {
  if (transport === "smtp") {
    const config: Record<string, string> = {
      host: form.host.trim(),
      port: form.port.trim(),
      encryption: form.encryption,
    };
    if (form.username.trim()) {
      config.username = form.username.trim();
    }
    if (form.region.trim()) {
      config.region = form.region.trim();
    }
    return config;
  }
  const config: Record<string, string> = {
    apiBaseUrl: form.apiBaseUrl.trim(),
  };
  if (form.region.trim()) {
    config.region = form.region.trim();
  }
  if (form.username.trim()) {
    config.username = form.username.trim();
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
  const [editing, setEditing] = useState<MessagingEmailAccount | null>(null);
  const [pickedProvider, setPickedProvider] = useState<MessagingEmailProvider | null>(null);
  const [form, setForm] = useState<AccountFormState | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const result = await admin.listEmailAccounts({ page: targetPage, pageSize: PAGE_SIZE });
      return {
        items: result.items,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      };
    },
    [admin],
  );

  const { items: accounts, page, pageMeta, load, reload } = usePagedList<MessagingEmailAccount>(
    fetchPage,
  );

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

  const pickProvider = (provider: MessagingEmailProvider) => {
    const entry = emailProviderCatalogEntry(provider);
    if (!entry) {
      return;
    }
    setPickedProvider(provider);
    setForm(emptyAccountForm(entry));
  };

  const beginEdit = (account: MessagingEmailAccount) => {
    setEditing(account);
    setPickedProvider(account.provider as MessagingEmailProvider);
    setForm(accountFormFromItem(account));
    setCatalogOpen(true);
  };

  const save = async () => {
    if (!form || !pickedProvider) {
      return;
    }
    const entry = emailProviderCatalogEntry(pickedProvider);
    if (!entry) {
      return;
    }
    const name = form.name.trim();
    if (!name) {
      setError(t("admin.notify.email.nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const config = accountConfigFromForm(form, entry.transport);
      if (editing) {
        await admin.updateEmailAccount(editing.id, {
          name,
          provider: pickedProvider,
          config,
          ...(form.secret.trim() ? { secret: form.secret } : {}),
          enabled: form.enabled,
          expectedVersion: editing.version,
        });
      } else {
        await admin.createEmailAccount({
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

  const toggleAccount = async (account: MessagingEmailAccount, enabled: boolean) => {
    setError(null);
    setNotice(null);
    try {
      await admin.updateEmailAccount(account.id, {
        name: account.name,
        provider: account.provider as MessagingEmailProvider,
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

  const removeAccount = async (account: MessagingEmailAccount) => {
    if (!window.confirm(t("admin.notify.email.deleteConfirm", { name: account.name }))) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await admin.deleteEmailAccount(account.id);
      setNotice(t("admin.notify.common.deleted"));
      await reload();
    } catch (error) {
      if (isConflictError(error)) {
        setError(t("admin.notify.common.conflict"));
        await reload();
      } else {
        setError(t("admin.notify.email.deleteFailed"));
      }
    }
  };

  const drawerEntry = pickedProvider ? emailProviderCatalogEntry(pickedProvider) : undefined;

  return (
    <section className="flex min-h-0 w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("admin.notify.email.accountsHint")}
        </p>
        <PrimaryButton onClick={beginCreate}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("admin.notify.email.addProvider")}
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
          {t("admin.notify.email.accountsEmpty")}
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
              ? t("admin.notify.email.editAccountTitle")
              : pickedProvider
                ? t("admin.notify.email.createAccountTitle")
                : t("admin.notify.email.addProvider")
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
              {EMAIL_PROVIDER_CATALOG.map((entry) => (
                <button
                  key={entry.provider}
                  type="button"
                  onClick={() => pickProvider(entry.provider)}
                  className="flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 p-4 text-left transition hover:border-sky-400 hover:bg-sky-50/60 dark:border-white/10 dark:hover:border-sky-500/50 dark:hover:bg-sky-500/5"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                    <Building2 className="h-4 w-4 text-sky-500" />
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
              <Field
                label={t("admin.notify.email.name")}
                hint={t("admin.notify.email.nameHint")}
              >
                <TextInput
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                  placeholder={t(drawerEntry.nameKey)}
                />
              </Field>
              {drawerEntry.transport === "smtp" ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Field label={t("admin.notify.email.host")}>
                        <TextInput
                          value={form.host}
                          onChange={(value) => setForm({ ...form, host: value })}
                          placeholder="smtp.example.com"
                        />
                      </Field>
                    </div>
                    <Field label={t("admin.notify.email.port")}>
                      <TextInput
                        value={form.port}
                        onChange={(value) => setForm({ ...form, port: value })}
                      />
                    </Field>
                  </div>
                  <Field label={t("admin.notify.email.encryption")}>
                    <SelectInput
                      value={form.encryption}
                      onChange={(value) => setForm({ ...form, encryption: value })}
                      options={[
                        { value: "smtps", label: t("admin.notify.email.encryption.smtps") },
                        { value: "starttls", label: t("admin.notify.email.encryption.starttls") },
                        { value: "none", label: t("admin.notify.email.encryption.none") },
                      ]}
                    />
                  </Field>
                  {form.region || drawerEntry.provider === "amazon_ses" ? (
                    <Field label={t("admin.notify.email.region")}>
                      <TextInput
                        value={form.region}
                        onChange={(value) => setForm({ ...form, region: value })}
                        placeholder="us-east-1"
                      />
                    </Field>
                  ) : null}
                  <Field label={t("admin.notify.email.username")}>
                    <TextInput
                      value={form.username}
                      onChange={(value) => setForm({ ...form, username: value })}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label={t("admin.notify.email.apiBaseUrl")}>
                    <TextInput
                      value={form.apiBaseUrl}
                      onChange={(value) => setForm({ ...form, apiBaseUrl: value })}
                    />
                  </Field>
                  {drawerEntry.provider === "mailgun" ? (
                    <Field label={t("admin.notify.email.region")}>
                      <SelectInput
                        value={form.region || "us"}
                        onChange={(value) => setForm({ ...form, region: value })}
                        options={[
                          { value: "us", label: "US" },
                          { value: "eu", label: "EU" },
                        ]}
                      />
                    </Field>
                  ) : null}
                </>
              )}
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
                    {t("admin.notify.email.enabledHint")}
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

// --------------------------------------------------------------- senders tab

interface SenderFormState {
  accountId: string;
  fromAddress: string;
  fromName: string;
  enabled: boolean;
}

function SendersPanel({ admin }: { admin: NotifyAdminService }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<MessagingEmailSender | null>(null);
  const [form, setForm] = useState<SenderFormState>({
    accountId: "",
    fromAddress: "",
    fromName: "",
    enabled: true,
  });

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const result = await admin.listEmailSenders({ page: targetPage, pageSize: PAGE_SIZE });
      return {
        items: result.items,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      };
    },
    [admin],
  );

  const {
    items: senders,
    page,
    pageMeta,
    load,
    reload,
  } = usePagedList<MessagingEmailSender>(fetchPage);
  const [accounts, setAccounts] = useState<MessagingEmailAccount[]>([]);

  const runLoad = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const [_, accountPage] = await Promise.all([
          load(targetPage),
          admin.listEmailAccounts({ page: 1, pageSize: PAGE_SIZE }),
        ]);
        setAccounts(accountPage.items);
      } catch {
        setError(t("admin.notify.common.loadFailed"));
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
      fromAddress: "",
      fromName: "",
      enabled: true,
    });
    setDrawerOpen(true);
  };

  const beginEdit = (sender: MessagingEmailSender) => {
    setEditing(sender);
    setForm({
      accountId: sender.accountId,
      fromAddress: sender.fromAddress,
      fromName: sender.fromName ?? "",
      enabled: sender.enabled,
    });
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (editing) {
        await admin.updateEmailSender(editing.id, {
          fromAddress: form.fromAddress.trim(),
          ...(form.fromName.trim() ? { fromName: form.fromName.trim() } : {}),
          enabled: form.enabled,
          expectedVersion: editing.version,
        });
      } else {
        await admin.createEmailSender({
          accountId: form.accountId,
          fromAddress: form.fromAddress.trim(),
          ...(form.fromName.trim() ? { fromName: form.fromName.trim() } : {}),
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

  const toggleSender = async (sender: MessagingEmailSender, enabled: boolean) => {
    setError(null);
    setNotice(null);
    try {
      await admin.updateEmailSender(sender.id, {
        fromAddress: sender.fromAddress,
        ...(sender.fromName ? { fromName: sender.fromName } : {}),
        enabled,
        expectedVersion: sender.version,
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

  const removeSender = async (sender: MessagingEmailSender) => {
    if (!window.confirm(t("admin.notify.senders.deleteConfirm", { address: sender.fromAddress }))) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await admin.deleteEmailSender(sender.id);
      setNotice(t("admin.notify.common.deleted"));
      await reload();
    } catch (error) {
      if (isConflictError(error)) {
        setError(t("admin.notify.common.conflict"));
        await reload();
      } else {
        setError(t("admin.notify.senders.deleteFailed"));
      }
    }
  };

  return (
    <section className="flex min-h-0 w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("admin.notify.email.sendersHint")}
        </p>
        <PrimaryButton onClick={beginCreate} disabled={accounts.length === 0}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("admin.notify.senders.addSender")}
          </span>
        </PrimaryButton>
      </div>
      {accounts.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t("admin.notify.senders.noAccountsHint")}
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
                  <th className="px-4 py-3 font-medium">{t("admin.notify.senders.fromAddress")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.notify.senders.fromName")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.notify.senders.account")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.notify.common.enabled")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.notify.templates.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {senders.map((sender) => (
                  <tr
                    key={sender.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                      {sender.fromAddress}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {sender.fromName || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{sender.accountName}</td>
                    <td className="px-4 py-3">
                      <ToggleInput
                        checked={sender.enabled}
                        onChange={(value) => void toggleSender(sender, value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => beginEdit(sender)}
                        className="mr-2 rounded px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
                      >
                        {t("admin.notify.common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeSender(sender)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("admin.notify.common.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
                {senders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                      {t("admin.notify.senders.empty")}
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
              ? t("admin.notify.senders.editTitle")
              : t("admin.notify.senders.createTitle")
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
            <Field label={t("admin.notify.senders.account")}>
              <SelectInput
                value={form.accountId}
                onChange={(value) => setForm({ ...form, accountId: value })}
                disabled={Boolean(editing)}
                options={accounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} · ${t(`admin.notify.emailProviders.${account.provider}.name`, account.provider)}`,
                }))}
              />
            </Field>
            <Field label={t("admin.notify.senders.fromAddress")}>
              <TextInput
                value={form.fromAddress}
                onChange={(value) => setForm({ ...form, fromAddress: value })}
                placeholder="no-reply@example.com"
              />
            </Field>
            <Field label={t("admin.notify.senders.fromName")}>
              <TextInput
                value={form.fromName}
                onChange={(value) => setForm({ ...form, fromName: value })}
              />
            </Field>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-white/5">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t("admin.notify.common.enabled")}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t("admin.notify.senders.enabledHint")}
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
  const [rules, setRules] = useState<MessagingEmailSendRule[]>([]);
  const [senders, setSenders] = useState<MessagingEmailSender[]>([]);
  const [chains, setChains] = useState<Record<string, string[]>>({});
  const [ruleVersions, setRuleVersions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingScenario, setSavingScenario] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ruleItems, senderPage] = await Promise.all([
      admin.listEmailSendRules(),
      admin.listEmailSenders({ page: 1, pageSize: 100 }),
    ]);
    setRules(ruleItems);
    setSenders(senderPage.items);
    const nextChains: Record<string, string[]> = {};
    const nextVersions: Record<string, string> = {};
    for (const rule of ruleItems) {
      nextChains[rule.scenario] = rule.chain.map((step) => step.senderId);
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

  const senderById = useMemo(() => {
    const index = new Map<string, MessagingEmailSender>();
    for (const sender of senders) {
      index.set(sender.id, sender);
    }
    return index;
  }, [senders]);

  const setChain = (scenario: MessagingEmailSendScenario, senderIds: string[]) => {
    setChains((current) => ({ ...current, [scenario]: senderIds }));
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
      await admin.updateEmailSendRule(scenario, {
        senderIds: chains[scenario] ?? [],
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
        {t("admin.notify.email.rulesHint")}
      </p>
      {error ? <ErrorState message={error} onRetry={() => void runLoad()} /> : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {EMAIL_SEND_SCENARIOS.map((scenario) => {
          const chain = chains[scenario] ?? [];
          const available = senders.filter((sender) => !chain.includes(sender.id));
          return (
            <article
              key={scenario}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]"
            >
              <div>
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                  <Route className="h-4 w-4 text-sky-500" />
                  {t(`admin.notify.rules.scenario.${scenario}`)}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t(`admin.notify.rules.scenario.${scenario}.description`)}
                </p>
              </div>
              <ol className="flex flex-col gap-2">
                {chain.map((senderId, index) => {
                  const sender = senderById.get(senderId);
                  return (
                    <li
                      key={senderId}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10"
                    >
                      <span className="w-5 shrink-0 text-center text-xs text-slate-400 dark:text-slate-500">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 dark:text-slate-200">
                        {sender?.fromAddress ?? senderId}
                        {sender ? (
                          <span className="ml-2 font-sans text-slate-400 dark:text-slate-500">
                            {sender.accountName}
                          </span>
                        ) : null}
                      </span>
                      {sender && !sender.enabled ? (
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
                            chain.filter((id) => id !== senderId),
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
                  {available.map((sender) => (
                    <option key={sender.id} value={sender.id}>
                      {sender.fromAddress} · {sender.accountName}
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
      {senders.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t("admin.notify.rules.noSendersHint")}
        </div>
      ) : null}
    </section>
  );
}

// --------------------------------------------------------------------- page

export function EmailChannelPage({ service }: SdkworkMessagingEmailChannelPageProps) {
  const { t } = useTranslation();
  const admin = service ?? defaultNotifyAdminService;
  const [tab, setTab] = useState<EmailTab>("accounts");

  return (
    <PageErrorBoundary>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          title={t("admin.notify.email.title")}
          description={t("admin.notify.email.description")}
        />
        <div
          role="tablist"
          className="flex w-full min-w-0 gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-[#1a1a1a]"
        >
          {EMAIL_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? "bg-sky-600 text-white shadow-sm dark:bg-sky-500"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-2 pr-0.5">
          {tab === "accounts" ? <AccountsPanel admin={admin} /> : null}
          {tab === "senders" ? <SendersPanel admin={admin} /> : null}
          {tab === "rules" ? <RulesPanel admin={admin} /> : null}
        </div>
      </div>
    </PageErrorBoundary>
  );
}
