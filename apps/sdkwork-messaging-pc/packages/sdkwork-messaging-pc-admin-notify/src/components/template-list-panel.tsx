//! Template list panel: searchable, filterable, keyboard-reachable master list
//! for the template workbench. The editor renders beside it and takes the
//! remaining viewport width.

import { useTranslation } from "react-i18next";
import {
  FileText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { StatusPill } from "./form";
import type { MessagingTemplate } from "@sdkwork/messaging-pc-core";

export interface TemplateListPanelProps {
  items: readonly MessagingTemplate[];
  totalItems: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  loading: boolean;
  keyword: string;
  statusFilter: string;
  selectedId: string | null;
  onKeywordChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelect: (item: MessagingTemplate) => void;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
}

const STATUS_FILTERS: readonly { value: string; labelKey: string }[] = [
  { value: "", labelKey: "admin.notify.templates.filterAll" },
  { value: "draft", labelKey: "admin.notify.status.draft" },
  { value: "active", labelKey: "admin.notify.status.active" },
  { value: "disabled", labelKey: "admin.notify.status.disabled" },
];

function formatUpdatedAt(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export function TemplateListPanel({
  items,
  totalItems,
  page,
  totalPages,
  hasMore,
  loading,
  keyword,
  statusFilter,
  selectedId,
  onKeywordChange,
  onStatusFilterChange,
  onSelect,
  onRefresh,
  onPageChange,
}: TemplateListPanelProps) {
  const { t } = useTranslation();
  const hasQuery = keyword.trim().length > 0 || statusFilter !== "";

  return (
    <aside
      aria-label={t("admin.notify.templates.listTitle")}
      className="flex min-h-0 w-full shrink-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:w-[340px] xl:w-[380px] dark:border-white/10 dark:bg-[#1a1a1a]"
    >
      <div className="shrink-0 space-y-2.5 border-b border-slate-200 p-3 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <FileText className="h-4 w-4 shrink-0 text-sky-500" />
            <span className="truncate">{t("admin.notify.templates.listTitle")}</span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-300">
              {totalItems}
            </span>
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            aria-label={t("admin.notify.common.refresh")}
            title={t("admin.notify.common.refresh")}
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder={t("admin.notify.templates.searchPlaceholder")}
            aria-label={t("admin.notify.templates.searchPlaceholder")}
            maxLength={128}
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-8 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-sky-500/20"
          />
          {keyword ? (
            <button
              type="button"
              onClick={() => onKeywordChange("")}
              aria-label={t("admin.notify.templates.clearSearch")}
              className="absolute right-1.5 top-1.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div
          role="group"
          aria-label={t("admin.notify.templates.filterAria")}
          className="flex flex-wrap gap-1"
        >
          {STATUS_FILTERS.map((filter) => {
            const selected = statusFilter === filter.value;
            return (
              <button
                key={filter.value || "all"}
                type="button"
                aria-pressed={selected}
                onClick={() => onStatusFilterChange(filter.value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? "bg-sky-500/10 text-sky-700 ring-1 ring-inset ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/25"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
              >
                {t(filter.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading && items.length === 0 ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="animate-pulse rounded-lg border border-slate-100 p-3 dark:border-white/5"
              >
                <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
                <div className="mt-2 h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100 dark:bg-white/5" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="rounded-full bg-slate-100 p-2.5 text-slate-400 dark:bg-white/10 dark:text-slate-500">
              <FileText className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {hasQuery
                ? t("admin.notify.templates.noResultsTitle")
                : t("admin.notify.templates.emptyTitle")}
            </p>
            <p className="max-w-[240px] text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              {hasQuery
                ? t("admin.notify.templates.noResultsDescription")
                : t("admin.notify.templates.emptyDescription")}
            </p>
            {hasQuery ? (
              <button
                type="button"
                onClick={() => {
                  onKeywordChange("");
                  onStatusFilterChange("");
                }}
                className="mt-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                {t("admin.notify.templates.clearFilters")}
              </button>
            ) : null}
          </div>
        ) : (
          <ul
            className={`space-y-1 transition-opacity ${loading ? "opacity-60" : ""}`}
            aria-label={t("admin.notify.templates.listTitle")}
          >
            {items.map((item) => {
              const selected = item.id === selectedId;
              const updatedAt = formatUpdatedAt(item.updatedAt);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    aria-current={selected ? "true" : undefined}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? "border-sky-400 bg-sky-50/80 dark:border-sky-500/50 dark:bg-sky-500/10"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {item.templateCode}
                      </span>
                      <StatusPill status={item.status} />
                    </div>
                    <div className="mt-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {item.name}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                      {item.content.replace(/\s+/gu, " ").trim() || "—"}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span>
                          {t("admin.notify.templates.variableCount", {
                            count: item.variables?.length ?? 0,
                          })}
                        </span>
                        {item.channel === "sms" ? (
                          <StatusPill status={item.approvalStatus} />
                        ) : null}
                      </span>
                      {updatedAt ? (
                        <span className="truncate">{updatedAt}</span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
        <span className="tabular-nums">
          {t("admin.notify.common.pageOf", {
            page,
            totalPages: Math.max(totalPages, page),
          })}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            {t("admin.notify.common.previous")}
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasMore}
            className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            {t("admin.notify.common.next")}
          </button>
        </div>
      </div>
    </aside>
  );
}
