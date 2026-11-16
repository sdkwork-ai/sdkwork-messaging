import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Filter, RefreshCcw } from "lucide-react";

import { ErrorState, LoadingState, PageHeader, PrimaryButton, SecondaryButton, TextInput, inputClass } from "../components/form";
import { ListPager } from "../components/list-pager";
import { PageErrorBoundary } from "../components/page-error-boundary";
import { SlideOver } from "../components/slide-over";
import {
  defaultNotifyAdminService,
  type MessagingSendRecord,
  type MessagingSendRecordStatus,
  type NotifyAdminService,
} from "../notifyAdminService";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  "accepted",
  "queued",
  "sent",
  "delivered",
  "failed",
  "opened",
  "cancelled",
  "expired",
] as const;

const STATUS_STYLES: Record<string, string> = {
  accepted: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  queued: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  sent: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  delivered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  opened: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  failed: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400",
  expired: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

type Channel = "email" | "sms";

export interface SdkworkMessagingSendRecordsPageProps {
  channel: Channel;
  service?: NotifyAdminService;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        STATUS_STYLES[status] ?? STATUS_STYLES.accepted
      }`}
    >
      {t(`admin.notify.records.status.${status}`, status)}
    </span>
  );
}

function formatDateTime(value: string | undefined): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export function SendRecordsPage({ channel, service }: SdkworkMessagingSendRecordsPageProps) {
  const { t } = useTranslation();
  const admin = service ?? defaultNotifyAdminService;
  const [records, setRecords] = useState<MessagingSendRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MessagingSendRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MessagingSendRecordStatus | "">("");
  const [keyword, setKeyword] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    status: MessagingSendRecordStatus | "";
    q: string;
    from: string;
    to: string;
  }>({
    status: "",
    q: "",
    from: "",
    to: "",
  });

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const result =
        channel === "email"
          ? await admin.listEmailSendRecords({
              page: targetPage,
              pageSize: PAGE_SIZE,
              status: appliedFilters.status || undefined,
              q: appliedFilters.q || undefined,
              from: appliedFilters.from || undefined,
              to: appliedFilters.to || undefined,
            })
          : await admin.listSmsSendRecords({
              page: targetPage,
              pageSize: PAGE_SIZE,
              status: appliedFilters.status || undefined,
              q: appliedFilters.q || undefined,
              from: appliedFilters.from || undefined,
              to: appliedFilters.to || undefined,
            });
      return result;
    },
    [admin, appliedFilters, channel],
  );

  const runLoad = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPage(targetPage);
        setRecords(result.items);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setHasMore(result.hasMore);
      } catch {
        setError(t("admin.notify.common.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, t],
  );

  useEffect(() => {
    void runLoad(1);
  }, [runLoad]);

  const applyFilters = () => {
    setAppliedFilters({ status: statusFilter, q: keyword.trim(), from, to });
  };

  const resetFilters = () => {
    setStatusFilter("");
    setKeyword("");
    setFrom("");
    setTo("");
    setAppliedFilters({ status: "", q: "", from: "", to: "" });
  };

  const openDetail = async (record: MessagingSendRecord) => {
    setDetail(record);
    setDetailLoading(true);
    try {
      const full =
        channel === "email"
          ? await admin.retrieveEmailSendRecord(record.id)
          : await admin.retrieveSmsSendRecord(record.id);
      setDetail(full);
    } catch {
      // Keep the list row visible; the detail request failure is non-fatal.
    } finally {
      setDetailLoading(false);
    }
  };

  const attempts = useMemo(() => detail?.attempts ?? [], [detail]);
  const channelLabel = t(
    channel === "email" ? "admin.notify.records.emailTitle" : "admin.notify.records.smsTitle",
  );

  return (
    <PageErrorBoundary>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          title={channelLabel}
          description={t("admin.notify.records.description")}
        />
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1a1a1a]">
          <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("admin.notify.records.filter.status")}
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as MessagingSendRecordStatus | "")
              }
              className={inputClass}
            >
              <option value="">{t("admin.notify.records.filter.allStatuses")}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {t(`admin.notify.records.status.${status}`, status)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("admin.notify.records.filter.keyword")}
            <TextInput
              value={keyword}
              onChange={setKeyword}
              placeholder={t("admin.notify.records.filter.keywordPlaceholder")}
            />
          </label>
          <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("admin.notify.records.filter.from")}
            <TextInput value={from} onChange={setFrom} placeholder="YYYY-MM-DD" />
          </label>
          <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("admin.notify.records.filter.to")}
            <TextInput value={to} onChange={setTo} placeholder="YYYY-MM-DD" />
          </label>
          <div className="flex items-center gap-2">
            <PrimaryButton onClick={applyFilters}>
              <span className="inline-flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                {t("admin.notify.records.filter.apply")}
              </span>
            </PrimaryButton>
            <SecondaryButton onClick={resetFilters}>
              <span className="inline-flex items-center gap-1.5">
                <RefreshCcw className="h-3.5 w-3.5" />
                {t("admin.notify.records.filter.reset")}
              </span>
            </SecondaryButton>
          </div>
        </div>
        {error ? <ErrorState message={error} onRetry={() => void runLoad(page)} /> : null}
        {loading ? (
          <LoadingState label={t("admin.notify.common.loading")} />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-[#202020] dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("admin.notify.records.table.time")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("admin.notify.records.table.target")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("admin.notify.records.table.content")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("admin.notify.records.table.scenario")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("admin.notify.records.table.provider")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("admin.notify.records.table.status")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("admin.notify.records.table.attempts")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${record.targetMasked} ${record.status}`}
                      onClick={() => void openDetail(record)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void openDetail(record);
                        }
                      }}
                      className="cursor-pointer border-b border-slate-100 last:border-0 align-top hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:border-white/5 dark:hover:bg-white/5 dark:focus:bg-white/5"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(record.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                        {record.targetMasked}
                      </td>
                      <td className="max-w-[22rem] px-4 py-3">
                        <div className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                          {record.subject ?? record.bodyPreview}
                        </div>
                        {record.subject ? (
                          <div className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {record.bodyPreview}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {t(`admin.notify.rules.scenario.${record.scenario}`, record.scenario)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {record.provider ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={record.status} />
                        {record.errorCode ? (
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="h-3 w-3" />
                            {record.errorCode}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {record.attemptCount}
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500"
                      >
                        {t("admin.notify.records.empty")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <ListPager
              page={page}
              totalPages={totalPages}
              hasMore={hasMore}
              onPrev={() => void runLoad(page - 1)}
              onNext={() => void runLoad(page + 1)}
            />
          </>
        )}
      </div>

      {detail ? (
        <SlideOver
          title={t("admin.notify.records.detailTitle")}
          onClose={() => setDetail(null)}
        >
          {detailLoading ? (
            <LoadingState label={t("admin.notify.common.loading")} />
          ) : (
            <div className="space-y-5">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                <dt className="text-slate-500 dark:text-slate-400">
                  {t("admin.notify.records.table.status")}
                </dt>
                <dd>
                  <StatusBadge status={detail.status} />
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">
                  {t("admin.notify.records.table.target")}
                </dt>
                <dd className="font-mono text-slate-700 dark:text-slate-200">
                  {detail.targetMasked}
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">
                  {t("admin.notify.records.table.scenario")}
                </dt>
                <dd className="text-slate-700 dark:text-slate-200">{detail.scenario}</dd>
                <dt className="text-slate-500 dark:text-slate-400">
                  {t("admin.notify.records.table.provider")}
                </dt>
                <dd className="text-slate-700 dark:text-slate-200">
                  {detail.provider ?? "—"}
                  {detail.providerMessageId ? (
                    <span className="ml-2 font-mono text-[11px] text-slate-400">
                      {detail.providerMessageId}
                    </span>
                  ) : null}
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">
                  {t("admin.notify.records.detail.createdAt")}
                </dt>
                <dd className="text-slate-700 dark:text-slate-200">
                  {formatDateTime(detail.createdAt)}
                </dd>
              </dl>
              <section>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                  {t("admin.notify.records.detail.content")}
                </h3>
                {detail.subject ? (
                  <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {detail.subject}
                  </p>
                ) : null}
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
                  {detail.bodyText ?? detail.bodyPreview}
                </p>
                {detail.body && detail.body !== detail.bodyText && detail.body.includes("<") ? (
                  <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <summary className="cursor-pointer">
                      {t("admin.notify.records.detail.htmlSource")}
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-white/5 dark:text-slate-300">
                      {detail.body}
                    </pre>
                  </details>
                ) : null}
              </section>
              {detail.errorMessage ? (
                <section className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  <p className="font-medium">{detail.errorCode ?? "error"}</p>
                  <p className="mt-1 whitespace-pre-wrap">{detail.errorMessage}</p>
                </section>
              ) : null}
              <section>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                  {t("admin.notify.records.detail.attempts")}
                </h3>
                <ol className="mt-2 space-y-2">
                  {attempts.map((attempt) => (
                    <li
                      key={attempt.id}
                      className="rounded-lg border border-slate-200 p-3 text-xs dark:border-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {attempt.provider ?? t("admin.notify.records.table.provider")}
                        </span>
                        <StatusBadge status={attempt.status} />
                      </div>
                      <p className="mt-1 text-slate-500 dark:text-slate-400">
                        {formatDateTime(attempt.createdAt)}
                        {attempt.providerMessageId ? ` · ${attempt.providerMessageId}` : ""}
                      </p>
                      {attempt.errorMessage ? (
                        <p className="mt-1 text-rose-600 dark:text-rose-400">
                          {attempt.errorCode ? `${attempt.errorCode}: ` : ""}
                          {attempt.errorMessage}
                        </p>
                      ) : null}
                    </li>
                  ))}
                  {attempts.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
                      {t("admin.notify.records.detail.noAttempts")}
                    </li>
                  ) : null}
                </ol>
              </section>
            </div>
          )}
        </SlideOver>
      ) : null}
    </PageErrorBoundary>
  );
}

/** Email send-record page (screen `email-records`). */
export function EmailSendRecordsPage({ service }: { service?: NotifyAdminService }) {
  return <SendRecordsPage channel="email" service={service} />;
}

/** SMS send-record page (screen `sms-records`). */
export function SmsSendRecordsPage({ service }: { service?: NotifyAdminService }) {
  return <SendRecordsPage channel="sms" service={service} />;
}
