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

import { ErrorState, LoadingState, PageHeader, SecondaryButton } from "../components/form";
import { PageErrorBoundary } from "../components/page-error-boundary";
import {
  defaultNotifyAdminService,
  type MessagingDashboardSummary,
  type NotifyAdminService,
} from "../notifyAdminService";

const RANGE_OPTIONS = [7, 30, 90] as const;

export interface SdkworkMessagingNotificationDashboardPageProps {
  service?: NotifyAdminService;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function MetricCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`rounded-lg p-1.5 ${accent}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-800 dark:text-white">{value}</p>
      {hint ? (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </article>
  );
}

export function NotificationDashboardPage({
  service,
}: SdkworkMessagingNotificationDashboardPageProps) {
  const { t } = useTranslation();
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

  const trend = summary?.trend ?? [];
  const maxTrend = useMemo(
    () =>
      trend.reduce(
        (max, point) => Math.max(max, point.email + point.sms),
        1,
      ),
    [trend],
  );
  const statusTotal = summary?.totals.total ?? 0;

  return (
    <PageErrorBoundary>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-y-auto pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title={t("admin.notify.dashboard.title")}
            description={t("admin.notify.dashboard.description")}
            className=""
          />
          <div className="flex items-center gap-2">
            {RANGE_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  rangeDays === days
                    ? "bg-sky-600 text-white"
                    : "border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
              >
                {t(`admin.notify.dashboard.range.${days}`, { days })}
              </button>
            ))}
            <SecondaryButton onClick={() => void load()}>
              <span className="inline-flex items-center gap-1.5">
                <RefreshCcw className="h-3.5 w-3.5" />
                {t("admin.notify.common.refresh")}
              </span>
            </SecondaryButton>
          </div>
        </div>

        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {loading || !summary ? (
          <LoadingState label={t("admin.notify.common.loading")} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:grid-cols-6">
              <MetricCard
                label={t("admin.notify.dashboard.metrics.total")}
                value={String(summary.totals.total)}
                hint={t("admin.notify.dashboard.metrics.totalHint", {
                  days: summary.rangeDays,
                })}
                accent="bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                icon={<Inbox className="h-4 w-4" />}
              />
              <MetricCard
                label={t("admin.notify.dashboard.metrics.email")}
                value={String(summary.totals.email)}
                accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
                icon={<Mail className="h-4 w-4" />}
              />
              <MetricCard
                label={t("admin.notify.dashboard.metrics.sms")}
                value={String(summary.totals.sms)}
                accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                icon={<MessageSquareText className="h-4 w-4" />}
              />
              <MetricCard
                label={t("admin.notify.dashboard.metrics.delivered")}
                value={String(summary.totals.delivered)}
                accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <MetricCard
                label={t("admin.notify.dashboard.metrics.failed")}
                value={String(summary.totals.failed)}
                accent="bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                icon={<AlertTriangle className="h-4 w-4" />}
              />
              <MetricCard
                label={t("admin.notify.dashboard.metrics.successRate")}
                value={formatPercent(summary.totals.successRate)}
                hint={t("admin.notify.dashboard.metrics.successRateHint")}
                accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
                icon={<TrendingUp className="h-4 w-4" />}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] 2xl:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t("admin.notify.dashboard.trendTitle")}
                  </h2>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {t("admin.notify.dashboard.trendLegend")}
                  </span>
                </div>
                {trend.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                    {t("admin.notify.dashboard.empty")}
                  </p>
                ) : (
                  <div className="mt-4 flex h-40 items-end gap-1.5 overflow-x-auto">
                    {trend.map((point) => {
                      const total = point.email + point.sms;
                      const emailHeight = total === 0 ? 0 : (point.email / maxTrend) * 100;
                      const smsHeight = total === 0 ? 0 : (point.sms / maxTrend) * 100;
                      return (
                        <div
                          key={point.date}
                          className="flex min-w-[10px] flex-1 flex-col items-center gap-1"
                          title={`${point.date} · email ${point.email} · sms ${point.sms} · delivered ${point.delivered} · failed ${point.failed}`}
                        >
                          <div className="flex h-32 w-full flex-col justify-end overflow-hidden rounded-sm bg-slate-100 dark:bg-white/5">
                            <div
                              className="w-full bg-sky-500/80"
                              style={{ height: `${emailHeight}%` }}
                            />
                            <div
                              className="w-full bg-emerald-500/80"
                              style={{ height: `${smsHeight}%` }}
                            />
                          </div>
                          <span className="rotate-45 whitespace-nowrap text-[9px] text-slate-400 dark:text-slate-500">
                            {point.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                  {t("admin.notify.dashboard.statusTitle")}
                </h2>
                <ul className="mt-3 space-y-2">
                  {summary.byStatus.map((row) => {
                    const percent = statusTotal === 0 ? 0 : row.count / statusTotal;
                    return (
                      <li key={row.status}>
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                          <span>{t(`admin.notify.records.status.${row.status}`, row.status)}</span>
                          <span className="font-medium">{row.count}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                          <div
                            className="h-full bg-sky-500"
                            style={{ width: `${Math.max(percent * 100, row.count > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                  {summary.byStatus.length === 0 ? (
                    <li className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      {t("admin.notify.dashboard.empty")}
                    </li>
                  ) : null}
                </ul>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs dark:border-white/5">
                  {summary.byChannel.map((row) => (
                    <div key={row.channel} className="rounded-lg bg-slate-50 p-2 dark:bg-white/5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t(`admin.notify.dashboard.channel.${row.channel}`)}
                      </p>
                      <p className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                        {row.total} · {row.delivered}/{row.failed}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                  {t("admin.notify.dashboard.scenarioTitle")}
                </h2>
                <table className="mt-3 w-full text-left text-xs">
                  <thead className="text-slate-400 dark:text-slate-500">
                    <tr>
                      <th className="py-1 font-medium">{t("admin.notify.records.table.scenario")}</th>
                      <th className="py-1 font-medium">{t("admin.notify.dashboard.channelLabel")}</th>
                      <th className="py-1 text-right font-medium">
                        {t("admin.notify.dashboard.columns.total")}
                      </th>
                      <th className="py-1 text-right font-medium">
                        {t("admin.notify.dashboard.columns.failed")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byScenario.map((row) => (
                      <tr
                        key={`${row.scenario}-${row.channel}`}
                        className="border-t border-slate-100 dark:border-white/5"
                      >
                        <td className="py-1.5 text-slate-700 dark:text-slate-200">
                          {t(`admin.notify.rules.scenario.${row.scenario}`, row.scenario)}
                        </td>
                        <td className="py-1.5 text-slate-500 dark:text-slate-400">
                          {t(`admin.notify.dashboard.channel.${row.channel}`)}
                        </td>
                        <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                          {row.total}
                        </td>
                        <td className="py-1.5 text-right text-rose-600 dark:text-rose-400">
                          {row.failed}
                        </td>
                      </tr>
                    ))}
                    {summary.byScenario.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 dark:text-slate-500">
                          {t("admin.notify.dashboard.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                  {t("admin.notify.dashboard.providerTitle")}
                </h2>
                <table className="mt-3 w-full text-left text-xs">
                  <thead className="text-slate-400 dark:text-slate-500">
                    <tr>
                      <th className="py-1 font-medium">{t("admin.notify.records.table.provider")}</th>
                      <th className="py-1 font-medium">{t("admin.notify.dashboard.channelLabel")}</th>
                      <th className="py-1 text-right font-medium">
                        {t("admin.notify.dashboard.columns.total")}
                      </th>
                      <th className="py-1 text-right font-medium">
                        {t("admin.notify.dashboard.columns.failed")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byProvider.map((row) => (
                      <tr
                        key={`${row.provider}-${row.channel}`}
                        className="border-t border-slate-100 dark:border-white/5"
                      >
                        <td className="py-1.5 font-mono text-slate-700 dark:text-slate-200">
                          {row.provider}
                        </td>
                        <td className="py-1.5 text-slate-500 dark:text-slate-400">
                          {t(`admin.notify.dashboard.channel.${row.channel}`)}
                        </td>
                        <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                          {row.total}
                        </td>
                        <td className="py-1.5 text-right text-rose-600 dark:text-rose-400">
                          {row.failed}
                        </td>
                      </tr>
                    ))}
                    {summary.byProvider.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 dark:text-slate-500">
                          {t("admin.notify.dashboard.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </section>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                {t("admin.notify.dashboard.failuresTitle")}
              </h2>
              <ul className="mt-3 space-y-2">
                {summary.recentFailures.map((record) => (
                  <li
                    key={record.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 text-xs dark:border-rose-500/20 dark:bg-rose-500/5"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span className="truncate font-mono text-slate-700 dark:text-slate-200">
                        {record.targetMasked}
                      </span>
                      <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-white/10 dark:text-slate-400">
                        {t(`admin.notify.dashboard.channel.${record.channel}`)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">
                      {record.errorCode ? `${record.errorCode}: ` : ""}
                      {record.errorMessage ?? record.bodyPreview}
                    </span>
                    <span className="whitespace-nowrap text-slate-400 dark:text-slate-500">
                      {new Date(record.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
                {summary.recentFailures.length === 0 ? (
                  <li className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    {t("admin.notify.dashboard.noFailures")}
                  </li>
                ) : null}
              </ul>
            </section>
          </>
        )}
      </div>
    </PageErrorBoundary>
  );
}
