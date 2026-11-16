import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleDashed, KeyRound, Power, Settings2 } from "lucide-react";

import { ProviderLogo } from "../providerLogos";
import { SecondaryButton } from "./form";

export interface ProviderDirectoryAccount {
  name: string;
  enabled: boolean;
  hasSecret: boolean;
}

export interface ProviderDirectoryEntry {
  provider: string;
  label: string;
  description: string;
  account?: ProviderDirectoryAccount;
}

export interface ProviderDirectoryProps {
  entries: readonly ProviderDirectoryEntry[];
  initializingProvider?: string | null;
  initializingAll?: boolean;
  onInitialize: (provider: string) => void;
  onEdit: (provider: string) => void;
  onInitializeAll?: () => void;
}

/**
 * Always-visible directory of every provider the channel supports.
 *
 * Seeded installations already have one account per provider, but the table
 * below only shows rows that exist. The directory makes a missing or deleted
 * provider explicit and offers the same full initialization the add-provider
 * picker uses (account + identity + routing steps).
 */
export function ProviderDirectory({
  entries,
  initializingProvider,
  initializingAll = false,
  onInitialize,
  onEdit,
  onInitializeAll,
}: ProviderDirectoryProps) {
  const { t } = useTranslation();
  const initialized = entries.filter((entry) => entry.account).length;
  const missing = entries.length - initialized;
  const busy = initializingAll || Boolean(initializingProvider);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            {t("admin.notify.providers.title")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {t("admin.notify.providers.hint", {
              total: entries.length,
              initialized,
              count: entries.length,
            })}
          </p>
        </div>
        {missing > 0 && onInitializeAll ? (
          <SecondaryButton onClick={onInitializeAll} disabled={busy}>
            <span className="inline-flex items-center gap-1.5">
              <CircleDashed className={initializingAll ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              {initializingAll
                ? t("admin.notify.providers.initializingAll")
                : t("admin.notify.providers.initializeAll", { count: missing })}
            </span>
          </SecondaryButton>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => {
          const isInitializing = initializingProvider === entry.provider;
          return (
            <article
              key={entry.provider}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <ProviderLogo provider={entry.provider} label={entry.label} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                    {entry.label}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    {entry.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                {entry.account ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("admin.notify.providers.initialized")}
                    </span>
                    <span
                      className={
                        entry.account.hasSecret
                          ? "inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                          : "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                      }
                    >
                      <KeyRound className="h-3 w-3" />
                      {entry.account.hasSecret
                        ? t("admin.notify.providers.credentialsReady")
                        : t("admin.notify.providers.credentialsMissing")}
                    </span>
                    <span
                      className={
                        entry.account.enabled
                          ? "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300"
                          : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400"
                      }
                    >
                      <Power className="h-3 w-3" />
                      {entry.account.enabled
                        ? t("admin.notify.providers.enabled")
                        : t("admin.notify.providers.disabled")}
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <CircleDashed className="h-3 w-3" />
                    {t("admin.notify.providers.missing")}
                  </span>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2">
                {entry.account ? (
                  <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                    {entry.account.name}
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    entry.account ? onEdit(entry.provider) : onInitialize(entry.provider)
                  }
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:border-sky-500/50 dark:hover:text-sky-300"
                >
                  {isInitializing ? (
                    <>
                      <CircleDashed className="h-3 w-3 animate-spin" />
                      {t("admin.notify.providers.initializing")}
                    </>
                  ) : entry.account ? (
                    <>
                      <Settings2 className="h-3 w-3" />
                      {t("admin.notify.providers.configure")}
                    </>
                  ) : (
                    <>
                      <CircleDashed className="h-3 w-3" />
                      {t("admin.notify.providers.initialize")}
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
