import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Mail,
  MessageSquareText,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";

import { ErrorState, PageHeader } from "../components/form";
import { PageErrorBoundary } from "../components/page-error-boundary";
import {
  defaultNotifyAdminService,
  type MessagingDashboardSummary,
  type NotifyAdminService,
} from "../notifyAdminService";

const RANGE_OPTIONS = [7, 30, 90] as const;

const CARD_CLASS =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]";

type TrendPoint = MessagingDashboardSummary["trend"][number];
type StatusRow = MessagingDashboardSummary["byStatus"][number];
type ChannelRow = MessagingDashboardSummary["byChannel"][number];
type FailureRow = MessagingDashboardSummary["recentFailures"][number];

/**
 * Status hues. The ring and the legend share one source so a color never means
 * two different things; `delivered`/`opened` are positive, `failed` is the only
 * rose slice, and the pending states stay neutral/blue.
 */
const STATUS_COLORS: Readonly<Record<string, { dot: string; stroke: string }>> = {
  delivered: { dot: "bg-emerald-500", stroke: "#10b981" },
  opened: { dot: "bg-emerald-400", stroke: "#34d399" },
  sent: { dot: "bg-sky-500", stroke: "#0ea5e9" },
  queued: { dot: "bg-sky-400", stroke: "#38bdf8" },
  accepted: { dot: "bg-slate-400", stroke: "#94a3b8" },
  expired: { dot: "bg-amber-500", stroke: "#f59e0b" },
  cancelled: { dot: "bg-slate-300", stroke: "#cbd5e1" },
  failed: { dot: "bg-rose-500", stroke: "#f43f5e" },
};

const FALLBACK_STATUS_COLOR = { dot: "bg-slate-300", stroke: "#cbd5e1" };

type SuccessTone = "good" | "warn" | "bad";

/** Delivery-quality thresholds: 99.5% is healthy, 95% is worth watching. */
function resolveSuccessTone(rate: number): SuccessTone {
  if (rate >= 0.995) {
    return "good";
  }
  return rate >= 0.95 ? "warn" : "bad";
}

const TONE_VALUE_CLASS: Readonly<Record<SuccessTone, string>> = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-rose-600 dark:text-rose-400",
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Share of a part inside a whole, kept readable for very small slices. */
function formatShare(part: number, total: number): string {
  if (total <= 0 || part <= 0) {
    return "0%";
  }
  const ratio = part / total;
  if (ratio < 0.001) {
    return "<0.1%";
  }
  return `${(ratio * 100).toFixed(ratio >= 0.1 ? 0 : 1)}%`;
}

function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Axis ticks use compact notation so the gutter never grows past two digits. */
function formatCompact(value: number, locale: string): string {
  if (value < 1000) {
    return String(value);
  }
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function KpiCard({
  label,
  value,
  hint,
  accent,
  icon,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  icon: ReactNode;
  valueClassName?: string;
}) {
  return (
    <article
      className={`${CARD_CLASS} flex min-w-0 flex-col p-4`}
      data-notify-kpi
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="min-w-0 truncate text-xs font-medium text-slate-500 dark:text-slate-400"
          title={label}
        >
          {label}
        </p>
        <span className={`shrink-0 rounded-lg p-1.5 ${accent}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          valueClassName ?? "text-slate-800 dark:text-white"
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-auto pt-1 text-[11px] leading-4 text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      ) : null}
    </article>
  );
}

function CardHeading({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h2>
        {meta ? (
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{meta}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Daily send volume as a stacked bar chart.
 *
 * The plot is a pure flex layout: no scroll container, no fixed bar width. The
 * daily label row is absolutely positioned against the same column grid, so a
 * 90-day window still renders five readable ticks instead of 90 clipped,
 * rotated labels, and nothing overflows the card (which is what produced the
 * stray vertical scrollbar the previous layout showed).
 */
function TrendChart({ trend }: { trend: readonly TrendPoint[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const peak = useMemo(
    () => trend.reduce((max, point) => Math.max(max, point.email + point.sms), 0),
    [trend],
  );
  const scale = Math.max(peak, 1);
  const ticks = useMemo(() => {
    if (trend.length <= 7) {
      return trend.map((_, index) => index);
    }
    const positions = [0, 0.25, 0.5, 0.75, 1];
    return [...new Set(positions.map((ratio) => Math.round(ratio * (trend.length - 1))))].sort(
      (a, b) => a - b,
    );
  }, [trend]);

  if (trend.length === 0 || peak === 0) {
    return (
      <p className="flex flex-1 items-center justify-center py-10 text-center text-xs text-slate-400 dark:text-slate-500">
        {t("admin.notify.dashboard.empty")}
      </p>
    );
  }

  return (
    <div className="mt-4 flex min-h-[168px] flex-1 flex-col">
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex w-9 shrink-0 flex-col justify-between pb-0 text-right text-[10px] leading-none tabular-nums text-slate-400 dark:text-slate-500">
          <span>{formatCompact(peak, locale)}</span>
          <span>{formatCompact(Math.round(peak / 2), locale)}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <span className="border-t border-slate-100 dark:border-white/5" />
            <span className="border-t border-slate-100 dark:border-white/5" />
            <span className="border-t border-slate-200 dark:border-white/10" />
          </div>
          <div className="relative flex h-full items-end gap-[2px]">
            {trend.map((point) => {
              const total = point.email + point.sms;
              return (
                <div
                  key={point.date}
                  className="flex h-full min-w-0 flex-1 items-end justify-center"
                  title={`${point.date} · ${t("admin.notify.dashboard.channel.email")} ${point.email} · ${t(
                    "admin.notify.dashboard.channel.sms",
                  )} ${point.sms} · ${t("admin.notify.dashboard.metrics.delivered")} ${point.delivered} · ${t(
                    "admin.notify.dashboard.metrics.failed",
                  )} ${point.failed}`}
                >
                  <div
                    className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px] transition-[filter] hover:brightness-110"
                    style={{
                      height: `${(total / scale) * 100}%`,
                      // A one-week window has room for readable columns; a
                      // 90-day window needs the width to stay with the data.
                      maxWidth: trend.length <= 10 ? 56 : 32,
                    }}
                  >
                    <div
                      className="w-full bg-emerald-500"
                      style={{ flexGrow: point.sms, flexBasis: 0 }}
                    />
                    <div
                      className="w-full bg-sky-500"
                      style={{ flexGrow: point.email, flexBasis: 0 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="relative mt-1.5 h-4 pl-11 text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
        {ticks.map((index) => {
          const point = trend[index];
          if (!point) {
            return null;
          }
          const ratio = (index + 0.5) / trend.length;
          // The final tick right-aligns so its label never spills past the card
          // padding (the rotated labels it replaced were clipped by it).
          const alignment =
            index === trend.length - 1 ? "-translate-x-full" : "-translate-x-1/2";
          return (
            <span
              key={point.date}
              className={`absolute top-0 whitespace-nowrap ${alignment}`}
              style={{ left: `${ratio * 100}%` }}
            >
              {point.date.slice(5)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Channel health footer: delivered share per channel, with absolute counts. */
function ChannelSummary({ rows }: { rows: readonly ChannelRow[] }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-white/5">
      {rows.map((row) => {
        const hasData = row.total > 0;
        const rate = hasData ? row.delivered / row.total : 0;
        const tone = resolveSuccessTone(rate);
        return (
          <div
            key={row.channel}
            className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-white/5 dark:bg-white/[0.03]"
          >
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                {row.channel === "email" ? (
                  <Mail className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden="true" />
                ) : (
                  <MessageSquareText
                    className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">
                  {t(`admin.notify.dashboard.channel.${row.channel}`, row.channel)}
                </span>
              </span>
              <span
                className={`shrink-0 tabular-nums font-semibold ${
                  hasData ? TONE_VALUE_CLASS[tone] : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {hasData ? formatPercent(rate) : "—"}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${rate * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
              {t("admin.notify.dashboard.channelHealth", {
                total: formatCount(row.total, i18n.language),
                delivered: formatCount(row.delivered, i18n.language),
                failed: formatCount(row.failed, i18n.language),
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Status distribution as a donut plus a legend.
 *
 * A donut keeps the dominance of `delivered` honest — one arc covers almost the
 * whole ring — while the legend still gives every status a readable number and
 * share. The old full-width bars made the minor statuses invisible slivers.
 *
 * `total` is the authoritative send count from the summary rather than the sum
 * of the status rows: the two can disagree when a record reports several status
 * transitions in the window, and the ring must never claim more records than
 * the totals card shows.
 */
function StatusDonut({ rows, total }: { rows: readonly StatusRow[]; total: number }) {
  const { t, i18n } = useTranslation();
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.count - a.count),
    [rows],
  );
  const denominator = total > 0 ? total : sorted.reduce((sum, row) => sum + row.count, 0);
  const radius = 52;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const slices: { row: StatusRow; length: number; offset: number }[] = [];
  let cursor = 0;
  for (const row of sorted) {
    const length = Math.min((row.count / Math.max(denominator, 1)) * circumference, circumference - cursor);
    if (length > 0) {
      slices.push({ row, length, offset: cursor });
    }
    cursor += length;
    if (cursor >= circumference) {
      break;
    }
  }

  if (denominator === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
        <span className="inline-flex h-24 w-24 items-center justify-center rounded-full border-[14px] border-slate-100 dark:border-white/5">
          <Inbox className="h-5 w-5 text-slate-300 dark:text-slate-600" aria-hidden="true" />
        </span>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t("admin.notify.dashboard.empty")}
        </p>
      </div>
    );
  }

  return (
    // Ring and legend travel together as one centred block, so a card that is
    // stretched by the neighbouring trend panel keeps the group balanced instead
    // of opening a gap between the ring and its legend.
    <div className="flex flex-1 flex-col justify-center gap-4 py-2">
      <div className="relative mx-auto h-[180px] w-[180px] shrink-0">
        <svg
          aria-hidden="true"
          className="h-full w-full -rotate-90"
          viewBox="0 0 136 136"
          role="presentation"
        >
          <circle
            cx="68"
            cy="68"
            fill="none"
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-slate-100 dark:stroke-white/[0.06]"
          />
          {slices.map(({ row, length, offset }) => (
            <circle
              key={row.status}
              cx="68"
              cy="68"
              fill="none"
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              stroke={STATUS_COLORS[row.status]?.stroke ?? FALLBACK_STATUS_COLOR.stroke}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums text-slate-800 dark:text-white">
            {formatCount(denominator, i18n.language)}
          </span>
          <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
            {t("admin.notify.dashboard.ringRecords")}
          </span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {sorted.map((row) => {
          const color = STATUS_COLORS[row.status] ?? FALLBACK_STATUS_COLOR;
          return (
            <li
              key={row.status}
              className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                {t(`admin.notify.records.status.${row.status}`, row.status)}
              </span>
              <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">
                {formatCount(row.count, i18n.language)}
              </span>
              <span className="w-11 shrink-0 text-right tabular-nums text-[11px] text-slate-400 dark:text-slate-500">
                {formatShare(row.count, denominator)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface DistributionRow {
  id: string;
  label: string;
  channel: string;
  total: number;
  failed: number;
  mono?: boolean;
}

/**
 * Shared scenario/provider breakdown.
 *
 * The total column pairs a share meter with the count and its share of the
 * column total, so rows can be ranked without comparing six-digit numbers by
 * eye while the table stays four columns wide — long scenario/provider ids keep
 * their room. Failures are tinted only when present so a clean table stays calm.
 */
function DistributionTable({
  rows,
  labelHeading,
  countCaption,
}: {
  rows: readonly DistributionRow[];
  labelHeading: string;
  countCaption: string;
}) {
  const { t, i18n } = useTranslation();
  const total = useMemo(() => rows.reduce((sum, row) => sum + row.total, 0), [rows]);

  if (rows.length === 0) {
    return (
      <p className="mt-4 mb-4 text-center text-xs text-slate-400 dark:text-slate-500">
        {t("admin.notify.dashboard.empty")}
      </p>
    );
  }

  return (
    <div className="mt-3 min-h-0">
      <table className="w-full table-fixed text-left text-xs">
        <caption className="sr-only">{countCaption}</caption>
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400 dark:border-white/5 dark:text-slate-500">
            <th className="w-[44%] py-1.5 pr-2 font-medium" scope="col">
              {labelHeading}
            </th>
            <th className="w-[52px] py-1.5 pr-2 font-medium" scope="col">
              {t("admin.notify.dashboard.channelLabel")}
            </th>
            <th className="w-[38%] py-1.5 pl-2 text-right font-medium" scope="col">
              {t("admin.notify.dashboard.columns.total")}
            </th>
            <th className="w-[52px] py-1.5 text-right font-medium" scope="col">
              {t("admin.notify.dashboard.columns.failed")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/[0.03]"
            >
              <td className="py-2 pr-2">
                <span
                  className={`block truncate ${
                    row.mono
                      ? "font-mono text-[11px] text-slate-600 dark:text-slate-300"
                      : "font-medium text-slate-700 dark:text-slate-200"
                  }`}
                  title={row.label}
                >
                  {row.label}
                </span>
              </td>
              <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">
                {t(`admin.notify.dashboard.channel.${row.channel}`, row.channel)}
              </td>
              <td className="py-2 pl-2">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <span
                      className="block h-full rounded-full bg-sky-500/70"
                      style={{ width: `${total === 0 ? 0 : (row.total / total) * 100}%` }}
                    />
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
                    {formatCount(row.total, i18n.language)}
                  </span>
                  <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                    {formatShare(row.total, total)}
                  </span>
                </span>
              </td>
              <td
                className={`py-2 text-right tabular-nums ${
                  row.failed > 0
                    ? "font-medium text-rose-600 dark:text-rose-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {formatCount(row.failed, i18n.language)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FailureList({ rows }: { rows: readonly FailureRow[] }) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
        {t("admin.notify.dashboard.noFailures")}
      </div>
    );
  }
  return (
    <ul className="mt-3 space-y-1.5">
      {rows.map((record) => (
        <li
          key={record.id}
          className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 text-xs dark:border-rose-500/20 dark:bg-rose-500/[0.06]"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden="true" />
          <span className="max-w-[42%] truncate font-mono text-slate-700 dark:text-slate-200">
            {record.targetMasked}
          </span>
          <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-300">
            {t(`admin.notify.dashboard.channel.${record.channel}`, record.channel)}
          </span>
          {record.errorCode ? (
            <code className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
              {record.errorCode}
            </code>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">
            {record.errorMessage ?? record.bodyPreview}
          </span>
          <span className="whitespace-nowrap text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
            {new Date(record.createdAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** First-load placeholder that mirrors the final grid so nothing jumps. */
function DashboardSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <p className="sr-only">{t("admin.notify.common.loading")}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={`${CARD_CLASS} h-[104px] animate-pulse p-4`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:flex-1 xl:grid-cols-3">
        <div className={`${CARD_CLASS} h-[396px] animate-pulse xl:col-span-2`} />
        <div className={`${CARD_CLASS} h-[396px] animate-pulse`} />
      </div>
      <div className={`${CARD_CLASS} h-[310px] animate-pulse`} />
      <div className={`${CARD_CLASS} h-[132px] animate-pulse`} />
    </div>
  );
}

export interface SdkworkMessagingNotificationDashboardPageProps {
  service?: NotifyAdminService;
}

export function NotificationDashboardPage({
  service,
}: SdkworkMessagingNotificationDashboardPageProps) {
  const { t, i18n } = useTranslation();
  const admin = service ?? defaultNotifyAdminService;
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [summary, setSummary] = useState<MessagingDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await admin.getNotificationDashboard(rangeDays));
    } catch {
      setError(t("admin.notify.common.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [admin, rangeDays, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const scenarioRows = useMemo<DistributionRow[]>(
    () =>
      [...(summary?.byScenario ?? [])]
        .filter((row) => row.total > 0)
        .sort((a, b) => b.total - a.total)
        .map((row) => ({
          id: `${row.scenario}-${row.channel}`,
          label: t(`admin.notify.rules.scenario.${row.scenario}`, row.scenario),
          channel: row.channel,
          total: row.total,
          failed: row.failed,
        })),
    [summary, t],
  );

  const providerRows = useMemo<DistributionRow[]>(
    () =>
      [...(summary?.byProvider ?? [])]
        .filter((row) => row.total > 0)
        .sort((a, b) => b.total - a.total)
        .map((row) => ({
          id: `${row.provider}-${row.channel}`,
          label: row.provider,
          channel: row.channel,
          total: row.total,
          failed: row.failed,
          mono: true,
        })),
    [summary],
  );

  const successTone = resolveSuccessTone(summary?.totals.successRate ?? 0);
  const showSkeleton = loading && !summary;

  return (
    <PageErrorBoundary>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title={t("admin.notify.dashboard.title")}
            description={t("admin.notify.dashboard.description")}
            className=""
          />
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label={t("admin.notify.dashboard.rangeLabel")}
              className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/5"
            >
              {RANGE_OPTIONS.map((days) => {
                const active = rangeDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRangeDays(days)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                    }`}
                  >
                    {t(`admin.notify.dashboard.range.${days}`, { days })}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <RefreshCcw
                aria-hidden="true"
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              {t("admin.notify.common.refresh")}
            </button>
          </div>
        </div>

        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {showSkeleton ? (
            <DashboardSkeleton />
          ) : summary ? (
            <div
              className={`flex min-h-full flex-col gap-4 pb-1 transition-opacity ${
                loading ? "opacity-60" : "opacity-100"
              }`}
              aria-busy={loading}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <KpiCard
                  label={t("admin.notify.dashboard.metrics.total")}
                  value={formatCount(summary.totals.total, i18n.language)}
                  hint={t("admin.notify.dashboard.metrics.totalHint", {
                    days: summary.rangeDays,
                  })}
                  accent="bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                  icon={<Inbox className="h-4 w-4" />}
                />
                <KpiCard
                  label={t("admin.notify.dashboard.metrics.email")}
                  value={formatCount(summary.totals.email, i18n.language)}
                  accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
                  icon={<Mail className="h-4 w-4" />}
                />
                <KpiCard
                  label={t("admin.notify.dashboard.metrics.sms")}
                  value={formatCount(summary.totals.sms, i18n.language)}
                  accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                  icon={<MessageSquareText className="h-4 w-4" />}
                />
                <KpiCard
                  label={t("admin.notify.dashboard.metrics.delivered")}
                  value={formatCount(summary.totals.delivered, i18n.language)}
                  accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />
                <KpiCard
                  label={t("admin.notify.dashboard.metrics.failed")}
                  value={formatCount(summary.totals.failed, i18n.language)}
                  accent="bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                  icon={<AlertTriangle className="h-4 w-4" />}
                  valueClassName={
                    summary.totals.failed > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-800 dark:text-white"
                  }
                />
                <KpiCard
                  label={t("admin.notify.dashboard.metrics.successRate")}
                  value={
                    summary.totals.total === 0 ? "—" : formatPercent(summary.totals.successRate)
                  }
                  hint={t("admin.notify.dashboard.metrics.successRateHint")}
                  accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
                  icon={<TrendingUp className="h-4 w-4" />}
                  valueClassName={
                    summary.totals.total === 0
                      ? "text-slate-400 dark:text-slate-500"
                      : TONE_VALUE_CLASS[successTone]
                  }
                />
              </div>

              {/* The trend row absorbs the height a tall viewport leaves over,
                  so the page ends on the last card instead of trailing blank
                  space below the failures list. */}
              <div className="grid grid-cols-1 gap-4 xl:flex-1 xl:grid-cols-3">
                <section
                  className={`${CARD_CLASS} flex min-w-0 flex-col p-4 xl:col-span-2`}
                  aria-label={t("admin.notify.dashboard.trendTitle")}
                >
                  <CardHeading
                    title={t("admin.notify.dashboard.trendTitle")}
                    meta={t("admin.notify.dashboard.window", {
                      from: summary.from.slice(5),
                      to: summary.to.slice(5),
                    })}
                    action={
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                          {t("admin.notify.dashboard.channel.email")}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                          {t("admin.notify.dashboard.channel.sms")}
                        </span>
                      </div>
                    }
                  />
                  <TrendChart trend={summary.trend} />
                  <div className="mt-3">
                    <ChannelSummary rows={summary.byChannel} />
                  </div>
                </section>

                <section
                  className={`${CARD_CLASS} flex min-w-0 flex-col p-4`}
                  aria-label={t("admin.notify.dashboard.statusTitle")}
                >
                  <CardHeading title={t("admin.notify.dashboard.statusTitle")} />
                  <StatusDonut rows={summary.byStatus} total={summary.totals.total} />
                </section>
              </div>

              {/* One panel for both breakdowns: two columns share a single card
                  boundary, so the shorter column never reads as a half-empty
                  card next to a full one. */}
              <section
                className={`${CARD_CLASS} flex min-w-0 flex-col p-4`}
                aria-label={t("admin.notify.dashboard.distributionTitle")}
              >
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-x-6 gap-y-5 xl:grid-cols-2">
                  <div
                    className="min-w-0"
                    aria-label={t("admin.notify.dashboard.scenarioTitle")}
                    role="group"
                  >
                    <CardHeading
                      title={t("admin.notify.dashboard.scenarioTitle")}
                      meta={t("admin.notify.dashboard.groupCount", { count: scenarioRows.length })}
                    />
                    <DistributionTable
                      rows={scenarioRows}
                      labelHeading={t("admin.notify.records.table.scenario")}
                      countCaption={t("admin.notify.dashboard.scenarioTitle")}
                    />
                  </div>

                  <div
                    className="min-w-0 xl:border-l xl:border-slate-100 xl:pl-6 dark:xl:border-white/5"
                    aria-label={t("admin.notify.dashboard.providerTitle")}
                    role="group"
                  >
                    <CardHeading
                      title={t("admin.notify.dashboard.providerTitle")}
                      meta={t("admin.notify.dashboard.groupCount", { count: providerRows.length })}
                    />
                    <DistributionTable
                      rows={providerRows}
                      labelHeading={t("admin.notify.records.table.provider")}
                      countCaption={t("admin.notify.dashboard.providerTitle")}
                    />
                  </div>
                </div>
              </section>

              <section
                className={`${CARD_CLASS} min-w-0 p-4`}
                aria-label={t("admin.notify.dashboard.failuresTitle")}
              >
                <CardHeading
                  title={t("admin.notify.dashboard.failuresTitle")}
                  action={
                    summary.recentFailures.length > 0 ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                        {formatCount(summary.recentFailures.length, i18n.language)}
                      </span>
                    ) : null
                  }
                />
                <FailureList rows={summary.recentFailures} />
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </PageErrorBoundary>
  );
}
