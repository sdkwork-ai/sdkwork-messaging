//! Lightweight Tailwind form primitives shared by the notify admin pages.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{title}</h1>
      {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{label}…</div>;
}

export function ErrorState({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700"
        >
          {retryLabel ?? t("admin.notify.common.retry", "Retry")}
        </button>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-sky-500/20 dark:disabled:bg-white/5";

export function TextInput(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "number";
  disabled?: boolean;
}) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.value)}
      className={inputClass}
    />
  );
}

export function SelectInput(props: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={props.value}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.value)}
      className={inputClass}
    >
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function TextAreaInput(props: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={props.value}
      rows={props.rows ?? 6}
      placeholder={props.placeholder}
      onChange={(event) => props.onChange(event.target.value)}
      className={`${inputClass} font-mono`}
    />
  );
}

export function ToggleInput(props: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      onClick={() => props.onChange(!props.checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        props.checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          props.checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex items-center justify-end gap-3">{children}</div>;
}

export function PrimaryButton(props: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400"
    >
      {props.children}
    </button>
  );
}

export function SecondaryButton(props: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
    >
      {props.children}
    </button>
  );
}

const STATUS_PILL_PALETTE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  disabled: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  pending: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  not_applicable: "bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400",
};

export function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_PILL_PALETTE[status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300"
      }`}
    >
      {t(`admin.notify.status.${status}`, status)}
    </span>
  );
}
