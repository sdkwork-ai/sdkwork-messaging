//! Provider initialization dialog.
//!
//! The always-visible provider directory was removed once accounts exist (the
//! account table plus "新增服务商" already list every provider). Initialization
//! still needs a home, so it lives here: the operator opens this dialog, sees
//! which providers are already initialized, and fills the rest in one click.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleDashed, KeyRound, Power } from "lucide-react";

import {
  PrimaryButton,
  SecondaryButton,
} from "./form";
import { OverlayPortal } from "./overlay-portal";
import { ProviderLogo } from "../providerLogos";
import type { ProviderDirectoryEntry } from "./ProviderDirectory";

export interface ProviderInitializeDialogProps {
  /** i18n namespace prefix: `admin.notify.emailProviders` or `admin.notify.smsProviders`. */
  catalogKeyPrefix: "admin.notify.emailProviders" | "admin.notify.smsProviders";
  entries: readonly ProviderDirectoryEntry[];
  initializingProvider?: string | null;
  initializingAll?: boolean;
  onInitialize: (provider: string) => void;
  onConfigure: (provider: string) => void;
  onInitializeAll?: () => void;
  onClose: () => void;
}

export function ProviderInitializeDialog({
  catalogKeyPrefix,
  entries,
  initializingProvider = null,
  initializingAll = false,
  onInitialize,
  onConfigure,
  onInitializeAll,
  onClose,
}: ProviderInitializeDialogProps) {
  const { t } = useTranslation();
  const missing = useMemo(
    () => entries.filter((entry) => !entry.account).length,
    [entries],
  );
  const busy = initializingAll || Boolean(initializingProvider);

  return (
    <OverlayPortal
      onDismiss={onClose}
      onEscape={onClose}
      zIndexClass="z-[110]"
      className="flex items-center justify-center bg-slate-900/40 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("admin.notify.providers.initializeTitle")}
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#1a1a1a]"
      >
        <div className="shrink-0 border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            {t("admin.notify.providers.initializeTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("admin.notify.providers.initializeDescription", {
              total: entries.length,
              missing,
            })}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {entries.map((entry) => {
              const isInitializing = initializingProvider === entry.provider;
              return (
                <article
                  key={entry.provider}
                  className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-white/10"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <ProviderLogo
                      provider={entry.provider}
                      label={entry.label}
                      size={32}
                    />
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
                        {entry.account.enabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            <Power className="h-3 w-3" />
                            {t("admin.notify.providers.enabled")}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        <CircleDashed className="h-3 w-3" />
                        {t("admin.notify.providers.missing")}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-end gap-2 pt-1">
                    {entry.account ? (
                      <SecondaryButton onClick={() => onConfigure(entry.provider)}>
                        {t("admin.notify.providers.configure")}
                      </SecondaryButton>
                    ) : (
                      <SecondaryButton
                        onClick={() => onInitialize(entry.provider)}
                        disabled={busy}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <CircleDashed
                            className={
                              isInitializing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"
                            }
                          />
                          {isInitializing
                            ? t("admin.notify.providers.initializing")
                            : t("admin.notify.providers.initialize")}
                        </span>
                      </SecondaryButton>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {t("admin.notify.providers.initializeFooter", { missing })}
          </span>
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={onClose} disabled={busy}>
              {t("admin.notify.common.close")}
            </SecondaryButton>
            {missing > 0 && onInitializeAll ? (
              <PrimaryButton onClick={onInitializeAll} disabled={busy}>
                <span className="inline-flex items-center gap-1.5">
                  <CircleDashed
                    className={initializingAll ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
                  />
                  {initializingAll
                    ? t("admin.notify.providers.initializingAll")
                    : t("admin.notify.providers.initializeAll", { count: missing })}
                </span>
              </PrimaryButton>
            ) : null}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
