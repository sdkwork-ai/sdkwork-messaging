import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  CircleDashed,
  Cloud,
  ExternalLink,
  KeyRound,
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
  selectClass,
} from "../components/form";
import { ProviderDirectory } from "../components/ProviderDirectory";
import { ProviderInitializeDialog } from "../components/provider-initialize-dialog";
import { ProviderLogo } from "../providerLogos";
import { SlideOver } from "../components/slide-over";
import { ListPager } from "../components/list-pager";
import { PageErrorBoundary } from "../components/page-error-boundary";
import { ChannelTabs } from "../components/channel-tabs";
import {
  NOTIFY_PAGE_SIZE as PAGE_SIZE,
  usePagedList,
} from "../components/use-paged-list";
import {
  SMS_PROVIDER_CATALOG,
  SMS_SEND_SCENARIOS,
  smsProviderCatalogEntry,
  smsProviderConfigDefaults,
} from "../smsProviderCatalog";
import {
  defaultNotifyAdminService,
  isConflictError,
  type MessagingEmailSendScenario,
  type MessagingSmsAccount,
  type MessagingSmsProvider,
  type MessagingSmsSignature,
  type NotifyAdminService,
} from "../notifyAdminService";
import {
  addDraftStep,
  createRuleDraft,
  isDraftDirty,
  moveDraftStep,
  removeDraftStep,
  reorderDraftToPriority,
  resetDraftToSaved,
  setDraftEnabled,
  toggleDraftStep,
  validateDraft,
  type SendRuleDraft,
} from "../sendRuleDraft";

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

interface AccountFormState {
  name: string;
  fields: Record<string, string>;
  secret: string;
  enabled: boolean;
  /**
   * IAM cloud account bound to this provider account. Signatures may override
   * it with their own binding. Empty means the account uses its own secret.
   */
  providerAccountId: string;
}

function emptyAccountForm(
  entry: (typeof SMS_PROVIDER_CATALOG)[number],
  name: string,
): AccountFormState {
  const defaults = smsProviderConfigDefaults(entry);
  const fields: Record<string, string> = {};
  for (const field of entry.fields) {
    fields[field.key] = defaults[field.key] ?? "";
  }
  return { name, fields, secret: "", enabled: false, providerAccountId: "" };
}

function accountFormFromItem(
  account: MessagingSmsAccount,
  entry: (typeof SMS_PROVIDER_CATALOG)[number],
): AccountFormState {
  const fields: Record<string, string> = {};
  for (const field of entry.fields) {
    fields[field.key] = readConfig(account.config, field.key) || field.preset || "";
  }
  return {
    name: account.name,
    fields,
    secret: "",
    enabled: account.enabled,
    providerAccountId: account.providerAccountId ?? "",
  };
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
  const [initializingProvider, setInitializingProvider] = useState<MessagingSmsProvider | null>(
    null,
  );
  const [initializingAll, setInitializingAll] = useState(false);
  const [initializeDialogOpen, setInitializeDialogOpen] = useState(false);

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
    const existing = accounts.find((account) => account.provider === provider);
    if (existing) {
      beginEdit(existing);
      return;
    }
    void initializeAndConfigure(provider);
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
    const endpointField = entry.fields.find(
      (field) => field.key === "endpoint" || field.key === "apiBaseUrl",
    );
    if (endpointField && !(form.fields[endpointField.key] ?? "").trim()) {
      setError(t("admin.notify.sms.endpointRequired"));
      return;
    }
    const missingField = entry.fields.find(
      (field) => !field.preset && !(form.fields[field.key] ?? "").trim(),
    );
    if (missingField) {
      setError(
        t("admin.notify.sms.fieldRequired", {
          field: t(missingField.labelKey),
        }),
      );
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

  /**
   * One-click channel initialization: the backend converges the provider's
   * account preset, signature identity, and scenario routing steps. Repeated
   * clicks are idempotent and never overwrite configured credentials.
   */
  const initializeProvider = async (provider: MessagingSmsProvider) => {
    setInitializingProvider(provider);
    setError(null);
    setNotice(null);
    try {
      await admin.initializeSmsProvider(provider);
      setNotice(
        t("admin.notify.sms.initDone", {
          provider: t(`admin.notify.smsProviders.${provider}.name`, provider),
        }),
      );
      await reload();
    } catch {
      setError(t("admin.notify.sms.initFailed"));
    } finally {
      setInitializingProvider(null);
    }
  };

  const initializeAndConfigure = async (provider: MessagingSmsProvider) => {
    setInitializingProvider(provider);
    setError(null);
    setNotice(null);
    try {
      const result = await admin.initializeSmsProvider(provider);
      const pageResult = await admin.listSmsAccounts({ page: 1, pageSize: 200 });
      const account =
        pageResult.items.find((item) => item.id === result.resourceId) ??
        pageResult.items.find((item) => item.provider === provider);
      await reload();
      if (account) {
        beginEdit(account);
        setNotice(
          t("admin.notify.sms.initDone", {
            provider: t(`admin.notify.smsProviders.${provider}.name`, provider),
          }),
        );
      } else {
        const entry = smsProviderCatalogEntry(provider);
        if (entry) {
          setPickedProvider(provider);
          setEditing(null);
          setForm(emptyAccountForm(entry, t(entry.nameKey)));
          setCatalogOpen(true);
        }
      }
    } catch {
      setError(t("admin.notify.sms.initFailed"));
      const entry = smsProviderCatalogEntry(provider);
      if (entry) {
        setPickedProvider(provider);
        setEditing(null);
        setForm(emptyAccountForm(entry, t(entry.nameKey)));
        setCatalogOpen(true);
      }
    } finally {
      setInitializingProvider(null);
    }
  };

  const initializeMissingProviders = async () => {
    setInitializingAll(true);
    setError(null);
    setNotice(null);
    let done = 0;
    let failed = 0;
    try {
      for (const entry of SMS_PROVIDER_CATALOG) {
        if (accounts.some((account) => account.provider === entry.provider)) {
          continue;
        }
        try {
          await admin.initializeSmsProvider(entry.provider);
          done += 1;
        } catch {
          failed += 1;
        }
      }
      await reload();
      setNotice(
        failed === 0
          ? t("admin.notify.providers.initAllDone", { count: done })
          : t("admin.notify.providers.initAllPartial", { done, failed }),
      );
    } catch {
      setError(t("admin.notify.sms.initFailed"));
    } finally {
      setInitializingAll(false);
    }
  };

  const directoryEntries = useMemo(
    () =>
      SMS_PROVIDER_CATALOG.map((entry) => {
        const account = accounts.find((item) => item.provider === entry.provider);
        return {
          provider: entry.provider,
          label: t(entry.nameKey),
          description: t(entry.descriptionKey),
          account: account
            ? { name: account.name, enabled: account.enabled, hasSecret: account.hasSecret }
            : undefined,
        };
      }),
    [accounts, t],
  );

  const drawerEntry = pickedProvider ? smsProviderCatalogEntry(pickedProvider) : undefined;

  return (
    <section className="flex min-h-0 w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("admin.notify.sms.accountsHint", { count: SMS_PROVIDER_CATALOG.length })}
        </p>
        <span className="inline-flex items-center gap-2">
          <SecondaryButton onClick={() => setInitializeDialogOpen(true)}>
            <span className="inline-flex items-center gap-2">
              <CircleDashed className="h-4 w-4" />
              {t("admin.notify.providers.initializeButton")}
            </span>
          </SecondaryButton>
          <PrimaryButton onClick={beginCreate}>
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("admin.notify.sms.addProvider")}
            </span>
          </PrimaryButton>
        </span>
      </div>
      {/*
        Onboarding aid only: once any account exists the table below is the
        source of truth, and "添加服务商" already lists every provider.
      */}
      {accounts.length === 0 ? (
        <ProviderDirectory
          entries={directoryEntries}
          initializingProvider={initializingProvider}
          initializingAll={initializingAll}
          onInitialize={(provider) => void initializeAndConfigure(provider as MessagingSmsProvider)}
          onEdit={(provider) => {
            const account = accounts.find((item) => item.provider === provider);
            if (account) {
              beginEdit(account);
            }
          }}
          onInitializeAll={() => void initializeMissingProviders()}
        />
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
          {accounts.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              {t("admin.notify.sms.accountsEmpty")}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {accounts.map((account) => (
              <article
                key={account.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <ProviderLogo
                      provider={account.provider}
                      label={t(`admin.notify.smsProviders.${account.provider}.name`, account.provider)}
                      size={32}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                        {t(
                          `admin.notify.smsProviders.${account.provider}.name`,
                          account.provider,
                        )}
                      </h3>
                      <div className="truncate text-xs text-slate-400 dark:text-slate-500">
                        {account.name}
                      </div>
                    </div>
                  </div>
                  <ToggleInput
                    checked={account.enabled}
                    ariaLabel={t("admin.notify.sms.toggleAccountAria", { name: account.name })}
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
                            {/* Localized label; unknown keys fall back to the raw key. */}
                            <dt className="shrink-0 font-medium">
                              {t(`admin.notify.sms.fields.${key}`, key)}
                            </dt>
                            <dd className="truncate font-mono">{String(value)}</dd>
                          </div>
                        ))
                    : null}
                </dl>
                {/*
                  Credential source at a glance: a cloud-account binding means
                  the operator manages the key in the account center, otherwise
                  the masked local credential (or "not set") applies.
                */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {account.providerAccountId ? (
                    <span
                      className={
                        account.providerAccountReady
                          ? "inline-flex max-w-full items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                          : "inline-flex max-w-full items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                      }
                      title={account.providerAccountId}
                    >
                      <Cloud className="h-3 w-3 shrink-0" />
                      <span className="truncate font-mono">{account.providerAccountId}</span>
                    </span>
                  ) : null}
                  {!account.hasSecret && !account.providerAccountReady ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      <KeyRound className="h-3 w-3" />
                      {t("admin.notify.providers.credentialsMissing")}
                    </span>
                  ) : null}
                </div>
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
                    disabled={initializingProvider !== null}
                    onClick={() => void initializeProvider(account.provider)}
                    className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    {initializingProvider === account.provider
                      ? t("admin.notify.common.initializing")
                      : t("admin.notify.common.initialize")}
                  </button>
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
                  disabled={initializingProvider !== null}
                  onClick={() => pickProvider(entry.provider)}
                  className="flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/5"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                    <ProviderLogo provider={entry.provider} label={t(entry.nameKey)} size={30} />
                    {t(entry.nameKey)}
                  </span>
                  <span className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {t(entry.descriptionKey)}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    {initializingProvider === entry.provider
                      ? t("admin.notify.providers.initializing")
                      : accounts.some((account) => account.provider === entry.provider)
                        ? t("admin.notify.providers.configure")
                        : t("admin.notify.providers.initialize")}
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
                  drawerEntry.setupHintKey
                    ? t(drawerEntry.setupHintKey)
                    : editing?.hasSecret
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
              <Field
                label={t("admin.notify.sms.providerAccount")}
                hint={t("admin.notify.sms.providerAccountHint")}
              >
                <TextInput
                  value={form.providerAccountId}
                  onChange={(value) => setForm({ ...form, providerAccountId: value })}
                  placeholder={t("admin.notify.sms.providerAccountPlaceholder")}
                />
              </Field>
              {drawerEntry.consoleUrl ? (
                <a
                  href={drawerEntry.consoleUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("admin.notify.common.openProviderConsole")}
                </a>
              ) : null}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-white/5">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t("admin.notify.common.enabled")}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t("admin.notify.sms.enabledHint")}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    {t("admin.notify.sms.identityEnableHint")}
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

      {initializeDialogOpen ? (
        <ProviderInitializeDialog
          catalogKeyPrefix="admin.notify.smsProviders"
          entries={directoryEntries}
          initializingProvider={initializingProvider}
          initializingAll={initializingAll}
          onInitialize={(provider) =>
            void initializeAndConfigure(provider as MessagingSmsProvider)
          }
          onConfigure={(provider) => {
            const account = accounts.find((item) => item.provider === provider);
            if (account) {
              setInitializeDialogOpen(false);
              beginEdit(account);
            }
          }}
          onInitializeAll={() => void initializeMissingProviders()}
          onClose={() => setInitializeDialogOpen(false)}
        />
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------ signatures tab

interface SignatureFormState {
  accountId: string;
  signName: string;
  enabled: boolean;
  /**
   * IAM cloud account bound to this signature. Empty string means no binding,
   * so the signature falls back to the provider account's own credential.
   */
  providerAccountId: string;
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
    providerAccountId: "",
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
      providerAccountId: "",
    });
    setDrawerOpen(true);
  };

  const beginEdit = (signature: MessagingSmsSignature) => {
    setEditing(signature);
    setForm({
      accountId: signature.accountId,
      signName: signature.signName,
      enabled: signature.enabled,
      providerAccountId: signature.providerAccountId ?? "",
    });
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    // Empty string clears an existing binding on update.
    const providerAccountId = form.providerAccountId.trim();
    try {
      if (editing) {
        await admin.updateSmsSignature(editing.id, {
          signName: form.signName.trim(),
          enabled: form.enabled,
          providerAccountId,
          expectedVersion: editing.version,
        });
      } else {
        await admin.createSmsSignature({
          accountId: form.accountId,
          signName: form.signName.trim(),
          enabled: form.enabled,
          providerAccountId: providerAccountId || null,
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
                      <span className="inline-flex items-center gap-2">
                        {signature.signName}
                        {signature.isDefault ? (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            {t("admin.notify.signatures.defaultBadge")}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {signature.accountName}
                    </td>
                    <td className="px-4 py-3">
                      <ToggleInput
                        checked={signature.enabled}
                        ariaLabel={t("admin.notify.signatures.toggleAria", {
                          name: signature.signName,
                        })}
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
                disabledHint={
                  editing ? t("admin.notify.signatures.accountLockedHint") : undefined
                }
                ariaLabel={t("admin.notify.signatures.account")}
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
            <Field
              label={t("admin.notify.signatures.providerAccount")}
              hint={t("admin.notify.signatures.providerAccountHint")}
            >
              <TextInput
                value={form.providerAccountId}
                onChange={(value) => setForm({ ...form, providerAccountId: value })}
                placeholder={t("admin.notify.signatures.providerAccountPlaceholder")}
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
  const [drafts, setDrafts] = useState<Record<string, SendRuleDraft>>({});
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
    const next: Record<string, SendRuleDraft> = {};
    for (const rule of ruleItems) {
      next[rule.scenario] = createRuleDraft({
        enabled: rule.enabled,
        steps: rule.chain.map((step) => ({
          id: step.signatureId,
          identityEnabled: step.identityEnabled,
          accountEnabled: step.accountEnabled,
          hasSecret: step.hasSecret,
          stepEnabled: step.stepEnabled,
        })),
        version: rule.version,
        updatedAt: rule.updatedAt ?? null,
      });
    }
    setDrafts(next);
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

  const updateDraft = (
    scenario: MessagingEmailSendScenario,
    updater: (draft: SendRuleDraft) => SendRuleDraft,
  ) => {
    setDrafts((current) => {
      const draft = current[scenario];
      if (!draft) {
        return current;
      }
      return { ...current, [scenario]: updater(draft) };
    });
  };

  /** Recommended fallback order = the default scenario chain's order. */
  const recommendedOrder = useMemo(() => {
    const chain = drafts.default?.steps ?? [];
    return chain.map((step) => step.id);
  }, [drafts.default]);

  const saveScenario = async (scenario: MessagingEmailSendScenario) => {
    const draft = drafts[scenario];
    if (!draft) {
      return;
    }
    const validation = validateDraft(draft);
    if (validation) {
      setError(t(`admin.notify.rules.validation.${validation}`));
      return;
    }
    setSavingScenario(scenario);
    setError(null);
    setNotice(null);
    try {
      const updated = await admin.updateSmsSendRule(scenario, {
        steps: draft.steps.map((step) => ({
          signatureId: step.id,
          enabled: step.stepEnabled,
        })),
        enabled: draft.enabled,
        expectedVersion: draft.version,
      });
      setDrafts((current) => ({
        ...current,
        [scenario]: createRuleDraft({
          enabled: updated.enabled,
          steps: updated.chain.map((step) => ({
            id: step.signatureId,
            identityEnabled: step.identityEnabled,
            accountEnabled: step.accountEnabled,
            hasSecret: step.hasSecret,
            stepEnabled: step.stepEnabled,
          })),
          version: updated.version,
          updatedAt: updated.updatedAt ?? null,
        }),
      }));
      setNotice(t("admin.notify.common.saved"));
    } catch (error) {
      if (isConflictError(error)) {
        setError(t("admin.notify.common.conflict"));
        await runLoad();
      } else {
        setError(t("admin.notify.sms.rules.saveFailed"));
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
          const draft = drafts[scenario];
          if (!draft) {
            return null;
          }
          const available = signatures.filter(
            (signature) => !draft.steps.some((step) => step.id === signature.id),
          );
          const validation = validateDraft(draft);
          const dirty = isDraftDirty(draft);
          const activeSteps = draft.steps.filter((step) => step.stepEnabled).length;
          return (
            <article
              key={scenario}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                    <Route className="h-4 w-4 text-emerald-500" />
                    {t(`admin.notify.rules.scenario.${scenario}`)}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t(`admin.notify.sms.rules.scenario.${scenario}.description`)}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>
                      {t("admin.notify.rules.stepSummary", {
                        total: draft.steps.length,
                        active: activeSteps,
                      })}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {draft.updatedAt
                        ? t("admin.notify.rules.updatedAt", {
                            time: new Date(draft.updatedAt).toLocaleString(),
                          })
                        : t("admin.notify.rules.neverSaved")}
                    </span>
                    {dirty ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                        {t("admin.notify.rules.unsaved")}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ToggleInput
                    checked={draft.enabled}
                    ariaLabel={t("admin.notify.rules.toggleAria", {
                      scenario: t(`admin.notify.rules.scenario.${scenario}`),
                    })}
                    onChange={(value) =>
                      updateDraft(scenario, (current) => setDraftEnabled(current, value))
                    }
                  />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {draft.enabled
                      ? t("admin.notify.common.enabled")
                      : t("admin.notify.rules.disabledRule")}
                  </span>
                </div>
              </div>
              {validation ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  {t(`admin.notify.rules.validation.${validation}`)}
                </p>
              ) : null}
              <ol className="flex flex-col gap-2">
                {draft.steps.map((step, index) => {
                  const signature = signatureById.get(step.id);
                  return (
                    <li
                      key={step.id}
                      className={`flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 ${
                        step.stepEnabled ? "" : "opacity-60"
                      }`}
                    >
                      <span className="w-5 shrink-0 text-center text-xs text-slate-400 dark:text-slate-500">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-slate-700 dark:text-slate-200">
                          {signature?.signName ?? step.id}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          {signature?.accountName ?? t("admin.notify.sms.rules.unknownIdentity")}
                          {!step.identityEnabled ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                              {t("admin.notify.sms.rules.identityDisabled")}
                            </span>
                          ) : null}
                          {!step.accountEnabled ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                              {t("admin.notify.rules.accountDisabled")}
                            </span>
                          ) : null}
                          {!step.hasSecret ? (
                            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                              {t("admin.notify.rules.credentialsMissing")}
                            </span>
                          ) : null}
                          {!step.stepEnabled ? (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                              {t("admin.notify.rules.stepDisabled")}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <ToggleInput
                        checked={step.stepEnabled}
                        ariaLabel={t("admin.notify.rules.stepToggleAria", {
                          name: `${signature?.signName ?? step.id} · ${signature?.accountName ?? ""}`,
                        })}
                        onChange={(value) =>
                          updateDraft(scenario, (current) =>
                            toggleDraftStep(current, step.id, value),
                          )
                        }
                      />
                      <button
                        type="button"
                        aria-label={t("admin.notify.rules.moveUp")}
                        onClick={() =>
                          updateDraft(scenario, (current) =>
                            moveDraftStep(current, index, -1),
                          )
                        }
                        disabled={index === 0}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("admin.notify.rules.moveDown")}
                        onClick={() =>
                          updateDraft(scenario, (current) =>
                            moveDraftStep(current, index, 1),
                          )
                        }
                        disabled={index === draft.steps.length - 1}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("admin.notify.rules.removeStep")}
                        onClick={() =>
                          updateDraft(scenario, (current) =>
                            removeDraftStep(current, step.id),
                          )
                        }
                        className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
                {draft.steps.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
                    {t("admin.notify.sms.rules.chainEmpty")}
                  </li>
                ) : null}
              </ol>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value=""
                  disabled={available.length === 0}
                  onChange={(event) => {
                    const value = event.target.value;
                    const signature = signatureById.get(value);
                    if (value) {
                      updateDraft(scenario, (current) =>
                        addDraftStep(current, value, signature?.enabled ?? true),
                      );
                    }
                  }}
                  className={`${selectClass} max-w-xs flex-1`}
                >
                  <option value="">{t("admin.notify.sms.rules.addStep")}</option>
                  {available.map((signature) => (
                    <option key={signature.id} value={signature.id}>
                      {signature.signName} · {signature.accountName}
                      {signature.enabled
                        ? ""
                        : ` · ${t("admin.notify.sms.rules.identityDisabled")}`}
                    </option>
                  ))}
                </select>
                <SecondaryButton
                  onClick={() => updateDraft(scenario, resetDraftToSaved)}
                  disabled={!dirty}
                >
                  {t("admin.notify.rules.reset")}
                </SecondaryButton>
                <SecondaryButton
                  onClick={() =>
                    updateDraft(scenario, (current) =>
                      reorderDraftToPriority(current, recommendedOrder),
                    )
                  }
                  disabled={draft.steps.length < 2}
                >
                  {t("admin.notify.rules.recommendedOrder")}
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => void saveScenario(scenario)}
                  disabled={savingScenario === scenario || !dirty || validation !== null}
                >
                  {savingScenario === scenario
                    ? t("admin.notify.common.saving")
                    : t("admin.notify.sms.rules.saveScenario")}
                </PrimaryButton>
              </div>
            </article>
          );
        })}
      </div>
      {signatures.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t("admin.notify.sms.rules.noSignaturesHint")}
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
        <ChannelTabs
          ariaLabel={t("admin.notify.sms.tabsAria")}
          activeId={tab}
          onChange={setTab}
          items={SMS_TABS.map((item) => ({ id: item.id, label: t(item.labelKey) }))}
        />
        <div className="min-h-0 flex-1 overflow-y-auto pb-2 pr-0.5">
          {tab === "accounts" ? <AccountsPanel admin={admin} /> : null}
          {tab === "signatures" ? <SignaturesPanel admin={admin} /> : null}
          {tab === "rules" ? <RulesPanel admin={admin} /> : null}
        </div>
      </div>
    </PageErrorBoundary>
  );
}
