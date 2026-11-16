import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Inbox,
  KeyRound,
  Plus,
  Route,
  Send,
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
import { ProviderDirectory } from "../components/ProviderDirectory";
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
  activeReceiveEndpoint,
  formatEndpoint,
  normalizeEncryption,
  parseEmailAccountConfig,
  serializeEmailAccountConfig,
  type EmailAccountConfig,
  type EmailEncryption,
  type EmailEndpoint,
  type EmailReceiveProtocol,
} from "../emailAccountConfig";
import {
  EMAIL_PROVIDER_CATALOG,
  EMAIL_SEND_SCENARIOS,
  emailProviderCatalogEntry,
  providerConfigDefaults,
  type EmailProviderCatalogEntry,
} from "../emailProviderCatalog";
import {
  defaultNotifyAdminService,
  isConflictError,
  type MessagingEmailAccount,
  type MessagingEmailProvider,
  type MessagingEmailSendScenario,
  type MessagingEmailSender,
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

export interface SdkworkMessagingEmailChannelPageProps {
  service?: NotifyAdminService;
}

type EmailTab = "accounts" | "senders" | "rules";

const EMAIL_TABS: readonly { id: EmailTab; labelKey: string }[] = [
  { id: "accounts", labelKey: "admin.notify.email.tab.accounts" },
  { id: "senders", labelKey: "admin.notify.email.tab.senders" },
  { id: "rules", labelKey: "admin.notify.email.tab.rules" },
];

const ENCRYPTION_OPTIONS: readonly EmailEncryption[] = ["ssl", "starttls", "none"];

const RECEIVE_PROTOCOL_OPTIONS: readonly EmailReceiveProtocol[] = ["imap", "pop3", "none"];

/** Translation function type derived from the hook, kept free of a direct i18next dependency. */
type Translate = ReturnType<typeof useTranslation>["t"];


/**
 * Send-side summary of an account. HTTP API providers show their endpoint;
 * SMTP providers show `host:port` plus the TLS mode, or the unconfigured
 * placeholder when the host has not been filled in yet.
 */
function sendSummary(
  account: MessagingEmailAccount,
  entry: EmailProviderCatalogEntry | undefined,
  t: Translate,
): string {
  const config = parseEmailAccountConfig(account.config);
  if (entry?.transport === "http_api" || config.transport === "http_api") {
    return config.apiBaseUrl
      ? `API · ${config.apiBaseUrl}`
      : t("admin.notify.email.notConfigured", { defaultValue: "Not configured" });
  }
  if (!config.send?.host) {
    return t("admin.notify.email.notConfigured", { defaultValue: "Not configured" });
  }
  return `SMTP · ${formatEndpoint(config.send)} · ${t(
    `admin.notify.email.encryption.${config.send.encryption}`,
    { defaultValue: config.send.encryption },
  )}`;
}

/** Receive-side summary: protocol plus endpoint, or the send-only placeholder. */
function receiveSummary(account: MessagingEmailAccount, t: Translate): string {
  const config = parseEmailAccountConfig(account.config);
  const endpoint = activeReceiveEndpoint(config);
  if (config.receiveProtocol === "none" || !endpoint?.host) {
    return t("admin.notify.email.receiveNone", { defaultValue: "Send only" });
  }
  return `${config.receiveProtocol.toUpperCase()} · ${formatEndpoint(endpoint)} · ${t(
    `admin.notify.email.encryption.${endpoint.encryption}`,
    { defaultValue: endpoint.encryption },
  )}`;
}

// --------------------------------------------------------------- account form

interface AccountFormState {
  name: string;
  username: string;
  secret: string;
  enabled: boolean;
  receiveEnabled: boolean;
  sendHost: string;
  sendPort: string;
  sendEncryption: EmailEncryption;
  apiBaseUrl: string;
  region: string;
  receiveProtocol: EmailReceiveProtocol;
  imap: EmailEndpoint;
  pop3: EmailEndpoint;
}

function endpointFromPreset(
  endpoint: EmailEndpoint | undefined,
  fallbackPort: string,
): EmailEndpoint {
  return endpoint ?? { host: "", port: fallbackPort, encryption: "ssl" };
}

function emptyAccountForm(entry: EmailProviderCatalogEntry, name: string): AccountFormState {
  const config = parseEmailAccountConfig(providerConfigDefaults(entry));
  return {
    name,
    username: config.username ?? "",
    secret: "",
    enabled: false,
    receiveEnabled: Boolean(entry.receive),
    sendHost: config.send?.host ?? "",
    sendPort: config.send?.port ?? "",
    sendEncryption: config.send?.encryption ?? "ssl",
    apiBaseUrl: config.apiBaseUrl,
    region: config.region,
    receiveProtocol: config.receiveProtocol,
    imap: endpointFromPreset(config.imap ?? entry.receive?.imap, "993"),
    pop3: endpointFromPreset(config.pop3 ?? entry.receive?.pop3, "995"),
  };
}

function accountFormFromItem(
  account: MessagingEmailAccount,
  entry: EmailProviderCatalogEntry | undefined,
): AccountFormState {
  const config = parseEmailAccountConfig(account.config);
  return {
    name: account.name,
    username: config.username,
    secret: "",
    enabled: account.enabled,
    receiveEnabled: account.receiveEnabled,
    sendHost: config.send?.host ?? entry?.send?.host ?? "",
    sendPort: config.send?.port ?? entry?.send?.port ?? "",
    sendEncryption: normalizeEncryption(
      config.send?.encryption ?? entry?.send?.encryption ?? "ssl",
    ),
    apiBaseUrl: config.apiBaseUrl || entry?.apiBaseUrl || "",
    region: config.region || entry?.region || "",
    // A legacy row without an inbound preset starts at the provider preset.
    receiveProtocol:
      config.receiveProtocol === "none" && entry?.receive && !config.imap && !config.pop3
        ? entry.receive.protocol
        : config.receiveProtocol,
    imap: config.imap ?? endpointFromPreset(entry?.receive?.imap, "993"),
    pop3: config.pop3 ?? endpointFromPreset(entry?.receive?.pop3, "995"),
  };
}

function accountConfigFromForm(
  form: AccountFormState,
  entry: EmailProviderCatalogEntry,
): Record<string, string> {
  const config: EmailAccountConfig = {
    transport: entry.transport,
    send:
      entry.transport === "smtp"
        ? { host: form.sendHost, port: form.sendPort, encryption: form.sendEncryption }
        : null,
    apiBaseUrl: form.apiBaseUrl,
    receiveProtocol: entry.receive ? form.receiveProtocol : "none",
    imap: entry.receive ? form.imap : null,
    pop3: entry.receive ? form.pop3 : null,
    username: form.username,
    region: form.region,
  };
  return serializeEmailAccountConfig(config);
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
  const [initializingProvider, setInitializingProvider] = useState<MessagingEmailProvider | null>(
    null,
  );
  const [initializingAll, setInitializingAll] = useState(false);

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
    const existing = accounts.find((account) => account.provider === provider);
    if (existing) {
      beginEdit(existing);
      return;
    }
    void initializeAndConfigure(provider);
  };

  const beginEdit = (account: MessagingEmailAccount) => {
    const entry = emailProviderCatalogEntry(account.provider);
    if (!entry) {
      setError(t("admin.notify.email.unknownProvider", { provider: account.provider }));
      return;
    }
    setEditing(account);
    setPickedProvider(account.provider as MessagingEmailProvider);
    setForm(accountFormFromItem(account, entry));
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
    if (entry.transport === "smtp" && !form.sendHost.trim()) {
      setError(t("admin.notify.email.hostRequired"));
      return;
    }
    if (entry.transport === "http_api" && !form.apiBaseUrl.trim()) {
      setError(t("admin.notify.email.apiBaseUrlRequired"));
      return;
    }
    if (!form.username.trim()) {
      setError(t("admin.notify.email.usernameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const config = accountConfigFromForm(form, entry);
      if (editing) {
        await admin.updateEmailAccount(editing.id, {
          name,
          provider: pickedProvider,
          config,
          ...(form.secret.trim() ? { secret: form.secret } : {}),
          enabled: form.enabled,
          receiveEnabled: form.receiveEnabled,
          expectedVersion: editing.version,
        });
      } else {
        await admin.createEmailAccount({
          name,
          provider: pickedProvider,
          config,
          ...(form.secret.trim() ? { secret: form.secret } : {}),
          enabled: form.enabled,
          receiveEnabled: form.receiveEnabled,
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

  const updateAccount = async (
    account: MessagingEmailAccount,
    patch: { enabled?: boolean; receiveEnabled?: boolean },
  ) => {
    setError(null);
    setNotice(null);
    try {
      await admin.updateEmailAccount(account.id, {
        name: account.name,
        provider: account.provider as MessagingEmailProvider,
        config: account.config ?? {},
        enabled: patch.enabled ?? account.enabled,
        receiveEnabled: patch.receiveEnabled ?? account.receiveEnabled,
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

  /**
   * One-click channel initialization: the backend converges the provider's
   * account preset, sender identity, and scenario routing steps. Repeated
   * clicks are idempotent and never overwrite configured credentials.
   */
  const initializeProvider = async (provider: MessagingEmailProvider) => {
    setInitializingProvider(provider);
    setError(null);
    setNotice(null);
    try {
      await admin.initializeEmailProvider(provider);
      setNotice(
        t("admin.notify.email.initDone", {
          provider: t(`admin.notify.emailProviders.${provider}.name`, provider),
        }),
      );
      await reload();
    } catch {
      setError(t("admin.notify.email.initFailed"));
    } finally {
      setInitializingProvider(null);
    }
  };

  const initializeAndConfigure = async (provider: MessagingEmailProvider) => {
    setInitializingProvider(provider);
    setError(null);
    setNotice(null);
    try {
      const result = await admin.initializeEmailProvider(provider);
      const pageResult = await admin.listEmailAccounts({ page: 1, pageSize: 200 });
      const account =
        pageResult.items.find((item) => item.id === result.resourceId) ??
        pageResult.items.find((item) => item.provider === provider);
      await reload();
      if (account) {
        beginEdit(account);
        setNotice(
          t("admin.notify.email.initDone", {
            provider: t(`admin.notify.emailProviders.${provider}.name`, provider),
          }),
        );
      } else {
        const entry = emailProviderCatalogEntry(provider);
        if (entry) {
          setPickedProvider(provider);
          setEditing(null);
          setForm(emptyAccountForm(entry, t(entry.nameKey)));
          setCatalogOpen(true);
        }
      }
    } catch {
      setError(t("admin.notify.email.initFailed"));
      const entry = emailProviderCatalogEntry(provider);
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
      for (const entry of EMAIL_PROVIDER_CATALOG) {
        if (accounts.some((account) => account.provider === entry.provider)) {
          continue;
        }
        try {
          await admin.initializeEmailProvider(entry.provider);
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
      setError(t("admin.notify.email.initFailed"));
    } finally {
      setInitializingAll(false);
    }
  };

  const directoryEntries = useMemo(
    () =>
      EMAIL_PROVIDER_CATALOG.map((entry) => {
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

  const drawerEntry = pickedProvider ? emailProviderCatalogEntry(pickedProvider) : undefined;

  return (
    <section className="flex min-h-0 w-full flex-col gap-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("admin.notify.email.accountsHint", { count: EMAIL_PROVIDER_CATALOG.length })}
      </p>
      <ProviderDirectory
        entries={directoryEntries}
        initializingProvider={initializingProvider}
        initializingAll={initializingAll}
        onInitialize={(provider) => void initializeAndConfigure(provider as MessagingEmailProvider)}
        onEdit={(provider) => {
          const account = accounts.find((item) => item.provider === provider);
          if (account) {
            beginEdit(account);
          }
        }}
        onInitializeAll={() => void initializeMissingProviders()}
      />
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
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("admin.notify.email.table.provider")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("admin.notify.email.table.send")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("admin.notify.email.table.receive")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("admin.notify.email.table.sendEnabled")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("admin.notify.email.table.receiveEnabled")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium normal-case">
                    {/* The create entry lives in the list header by contract. */}
                    <PrimaryButton onClick={beginCreate}>
                      <span className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t("admin.notify.email.addProvider")}
                      </span>
                    </PrimaryButton>
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const entry = emailProviderCatalogEntry(account.provider);
                  const receiveSupported = Boolean(entry?.receive);
                  return (
                    <tr
                      key={account.id}
                      className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <ProviderLogo
                            provider={account.provider}
                            label={t(`admin.notify.emailProviders.${account.provider}.name`, account.provider)}
                            size={30}
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-800 dark:text-white">
                              {t(
                                `admin.notify.emailProviders.${account.provider}.name`,
                                account.provider,
                              )}
                            </div>
                            <div className="truncate text-xs text-slate-400 dark:text-slate-500">
                              {account.name}
                            </div>
                            <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                              <KeyRound className="h-3.5 w-3.5" />
                              {account.hasSecret
                                ? account.keyDisplayMasked
                                : t("admin.notify.common.secretEmptyHint")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {sendSummary(account, entry, t)}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        <span className={account.receiveEnabled ? "" : "opacity-60"}>
                          {receiveSummary(account, t)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <ToggleInput
                          checked={account.enabled}
                          ariaLabel={t("admin.notify.email.toggleSendAria", {
                            name: account.name,
                          })}
                          onChange={(value) => void updateAccount(account, { enabled: value })}
                        />
                      </td>
                      <td className="px-4 py-4">
                        {receiveSupported ? (
                          <ToggleInput
                            checked={account.receiveEnabled}
                            ariaLabel={t("admin.notify.email.toggleReceiveAria", {
                              name: account.name,
                            })}
                            onChange={(value) =>
                              void updateAccount(account, { receiveEnabled: value })
                            }
                          />
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          disabled={initializingProvider !== null}
                          onClick={() => void initializeProvider(account.provider)}
                          className="mr-2 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          {initializingProvider === account.provider
                            ? t("admin.notify.common.initializing")
                            : t("admin.notify.common.initialize")}
                        </button>
                        <button
                          type="button"
                          onClick={() => beginEdit(account)}
                          className="mr-2 rounded px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
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
                      </td>
                    </tr>
                  );
                })}
                {accounts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-slate-400 dark:text-slate-500"
                    >
                      {t("admin.notify.email.accountsEmpty")}
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
                  disabled={initializingProvider !== null}
                  onClick={() => pickProvider(entry.provider)}
                  className="flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 p-4 text-left transition hover:border-sky-400 hover:bg-sky-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:hover:border-sky-500/50 dark:hover:bg-sky-500/5"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                    <ProviderLogo provider={entry.provider} label={t(entry.nameKey)} size={30} />
                    {t(entry.nameKey)}
                  </span>
                  <span className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {t(entry.descriptionKey)}
                  </span>
                  <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
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
              <Field
                label={t("admin.notify.email.username")}
                hint={t("admin.notify.email.usernameHint")}
              >
                <TextInput
                  value={form.username}
                  onChange={(value) => setForm({ ...form, username: value })}
                  placeholder="no-reply@example.com"
                />
              </Field>
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
              {drawerEntry.consoleUrl ? (
                <a
                  href={drawerEntry.consoleUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("admin.notify.common.openProviderConsole")}
                </a>
              ) : null}

              <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <header className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                  <Send className="h-4 w-4 text-sky-500" />
                  {t("admin.notify.email.section.send")}
                </header>
                {drawerEntry.transport === "smtp" ? (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Field label={t("admin.notify.email.host")}>
                          <TextInput
                            value={form.sendHost}
                            onChange={(value) => setForm({ ...form, sendHost: value })}
                            placeholder="smtp.example.com"
                          />
                        </Field>
                      </div>
                      <Field label={t("admin.notify.email.port")}>
                        <TextInput
                          value={form.sendPort}
                          onChange={(value) => setForm({ ...form, sendPort: value })}
                        />
                      </Field>
                    </div>
                    <Field label={t("admin.notify.email.encryption")}>
                      <SelectInput
                        value={form.sendEncryption}
                        onChange={(value) =>
                          setForm({ ...form, sendEncryption: normalizeEncryption(value) })
                        }
                        options={ENCRYPTION_OPTIONS.map((option) => ({
                          value: option,
                          label: t(`admin.notify.email.encryption.${option}`, option),
                        }))}
                      />
                    </Field>
                  </>
                ) : (
                  <Field label={t("admin.notify.email.apiBaseUrl")}>
                    <TextInput
                      value={form.apiBaseUrl}
                      onChange={(value) => setForm({ ...form, apiBaseUrl: value })}
                    />
                  </Field>
                )}
                {form.region || drawerEntry.region || drawerEntry.provider === "amazon_ses" ? (
                  <Field label={t("admin.notify.email.region")}>
                    <TextInput
                      value={form.region}
                      onChange={(value) => setForm({ ...form, region: value })}
                      placeholder="us-east-1"
                    />
                  </Field>
                ) : null}
              </section>

              <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <header className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                  <Inbox className="h-4 w-4 text-emerald-500" />
                  {t("admin.notify.email.section.receive")}
                </header>
                {drawerEntry.receive ? (
                  <>
                    <Field
                      label={t("admin.notify.email.receiveProtocol")}
                      hint={t("admin.notify.email.receiveProtocolHint")}
                    >
                      <SelectInput
                        value={form.receiveProtocol}
                        onChange={(value) =>
                          setForm({
                            ...form,
                            receiveProtocol: value as EmailReceiveProtocol,
                          })
                        }
                        options={RECEIVE_PROTOCOL_OPTIONS.map((option) => ({
                          value: option,
                          label: t(`admin.notify.email.receiveProtocol.${option}`, option),
                        }))}
                      />
                    </Field>
                    {form.receiveProtocol === "imap" ? (
                      <EndpointFields
                        title="IMAP"
                        endpoint={form.imap}
                        onChange={(imap) => setForm({ ...form, imap })}
                      />
                    ) : null}
                    {form.receiveProtocol === "pop3" ? (
                      <EndpointFields
                        title="POP3"
                        endpoint={form.pop3}
                        onChange={(pop3) => setForm({ ...form, pop3 })}
                      />
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("admin.notify.email.receiveUnsupportedHint")}
                  </p>
                )}
              </section>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-white/5">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t("admin.notify.email.table.sendEnabled")}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {t("admin.notify.email.enabledHint")}
                    </p>
                  </div>
                  <ToggleInput
                    checked={form.enabled}
                    ariaLabel={t("admin.notify.email.toggleSendAria", { name: form.name })}
                    onChange={(value) => setForm({ ...form, enabled: value })}
                  />
                </div>
                {drawerEntry.receive ? (
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-white/5">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t("admin.notify.email.table.receiveEnabled")}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {t("admin.notify.email.receiveEnabledHint")}
                      </p>
                    </div>
                    <ToggleInput
                      checked={form.receiveEnabled}
                      ariaLabel={t("admin.notify.email.toggleReceiveAria", { name: form.name })}
                      onChange={(value) => setForm({ ...form, receiveEnabled: value })}
                    />
                  </div>
                ) : null}
              </div>
              <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">
                {t("admin.notify.email.identityEnableHint")}
              </p>
            </div>
          ) : null}
        </SlideOver>
      ) : null}
    </section>
  );
}

function EndpointFields({
  title,
  endpoint,
  onChange,
}: {
  title: string;
  endpoint: EmailEndpoint;
  onChange: (endpoint: EmailEndpoint) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 rounded-lg bg-slate-50/70 p-3 dark:bg-white/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Field label={t("admin.notify.email.host")}>
            <TextInput
              value={endpoint.host}
              onChange={(value) => onChange({ ...endpoint, host: value })}
              placeholder="imap.example.com"
            />
          </Field>
        </div>
        <Field label={t("admin.notify.email.port")}>
          <TextInput
            value={endpoint.port}
            onChange={(value) => onChange({ ...endpoint, port: value })}
          />
        </Field>
      </div>
      <Field label={t("admin.notify.email.encryption")}>
        <SelectInput
          value={endpoint.encryption}
          onChange={(value) => onChange({ ...endpoint, encryption: normalizeEncryption(value) })}
          options={ENCRYPTION_OPTIONS.map((option) => ({
            value: option,
            label: t(`admin.notify.email.encryption.${option}`, option),
          }))}
        />
      </Field>
    </div>
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
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("admin.notify.senders.fromAddress")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("admin.notify.senders.fromName")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("admin.notify.senders.account")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("admin.notify.common.enabled")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    {t("admin.notify.templates.actions")}
                  </th>
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
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {sender.accountName}
                    </td>
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
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-400 dark:text-slate-500"
                    >
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
  const [senders, setSenders] = useState<MessagingEmailSender[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SendRuleDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingScenario, setSavingScenario] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ruleItems, senderPage] = await Promise.all([
      admin.listEmailSendRules(),
      admin.listEmailSenders({ page: 1, pageSize: 100 }),
    ]);
    setSenders(senderPage.items);
    const next: Record<string, SendRuleDraft> = {};
    for (const rule of ruleItems) {
      next[rule.scenario] = createRuleDraft({
        enabled: rule.enabled,
        steps: rule.chain.map((step) => ({
          id: step.senderId,
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

  const senderById = useMemo(() => {
    const index = new Map<string, MessagingEmailSender>();
    for (const sender of senders) {
      index.set(sender.id, sender);
    }
    return index;
  }, [senders]);

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
      const updated = await admin.updateEmailSendRule(scenario, {
        steps: draft.steps.map((step) => ({
          senderId: step.id,
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
            id: step.senderId,
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
          const draft = drafts[scenario];
          if (!draft) {
            return null;
          }
          const available = senders.filter(
            (sender) => !draft.steps.some((step) => step.id === sender.id),
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
                    <Route className="h-4 w-4 text-sky-500" />
                    {t(`admin.notify.rules.scenario.${scenario}`)}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t(`admin.notify.rules.scenario.${scenario}.description`)}
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
                  const sender = senderById.get(step.id);
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
                        <span className="block truncate font-mono text-xs text-slate-700 dark:text-slate-200">
                          {sender?.fromAddress ?? step.id}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          {sender?.accountName ?? t("admin.notify.rules.unknownIdentity")}
                          {!step.identityEnabled ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                              {t("admin.notify.rules.identityDisabled")}
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
                          name: sender?.fromAddress ?? step.id,
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
                    const sender = senderById.get(value);
                    if (value) {
                      updateDraft(scenario, (current) =>
                        addDraftStep(current, value, sender?.enabled ?? true),
                      );
                    }
                  }}
                  className={`${inputClass} max-w-xs flex-1`}
                >
                  <option value="">{t("admin.notify.rules.addStep")}</option>
                  {available.map((sender) => (
                    <option key={sender.id} value={sender.id}>
                      {sender.fromAddress} · {sender.accountName}
                      {sender.enabled ? "" : ` · ${t("admin.notify.rules.identityDisabled")}`}
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
        <ChannelTabs
          ariaLabel={t("admin.notify.email.tabsAria")}
          activeId={tab}
          onChange={setTab}
          items={EMAIL_TABS.map((item) => ({ id: item.id, label: t(item.labelKey) }))}
        />
        <div className="min-h-0 flex-1 overflow-y-auto pb-2 pr-0.5">
          {tab === "accounts" ? <AccountsPanel admin={admin} /> : null}
          {tab === "senders" ? <SendersPanel admin={admin} /> : null}
          {tab === "rules" ? <RulesPanel admin={admin} /> : null}
        </div>
      </div>
    </PageErrorBoundary>
  );
}
