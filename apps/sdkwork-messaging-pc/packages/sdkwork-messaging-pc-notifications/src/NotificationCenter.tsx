import type { MessagingLocale, MessagingNotification, NotificationCenterService } from "@sdkwork/messaging-pc-core";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NotificationDetail } from "./components/NotificationDetail.tsx";
import { NotificationGuestState } from "./components/NotificationGuestState.tsx";
import { NotificationEmpty, NotificationError, NotificationLoading } from "./components/NotificationState.tsx";
import { NotificationList } from "./components/NotificationList.tsx";
import { NotificationNavigation } from "./components/NotificationNavigation.tsx";
import { createNotificationTranslator } from "./services/notification-translator.ts";
import {
  notificationMatchesSearch,
  notificationMatchesView,
  type NotificationCenterAccess,
  type NotificationView,
} from "./notification-types.ts";
import { useNotificationCenter } from "./use-notification-center.ts";

export const NOTIFICATION_CENTER_ROUTE = "/notifications";

function parseTotalItems(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function NotificationCenter({
  access,
  locale,
}: {
  access: NotificationCenterAccess;
  locale: MessagingLocale;
}) {
  if (access.status === "anonymous") {
    return <NotificationGuestState locale={locale} signInHref={access.signInHref} />;
  }

  return <AuthenticatedNotificationCenter locale={locale} service={access.service} />;
}

function AuthenticatedNotificationCenter({
  locale,
  service,
}: {
  locale: MessagingLocale;
  service: NotificationCenterService;
}) {
  const t = useMemo(() => createNotificationTranslator(locale), [locale]);
  const { loadState, markRead, markingId, page, refresh, setPage } = useNotificationCenter(service);
  const [activeView, setActiveView] = useState<NotificationView>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();

  const pageValue = loadState.status === "ready" ? loadState.value : undefined;
  const visibleItems = useMemo(() => (pageValue?.items ?? [])
    .filter((item) => notificationMatchesView(item, activeView))
    .filter((item) => notificationMatchesSearch(item, query)), [activeView, pageValue?.items, query]);
  const selected = pageValue?.items.find((item) => item.id === selectedId);
  const unreadCount = pageValue?.items.filter((item) => item.status === "unread").length ?? 0;

  useEffect(() => {
    if (loadState.status !== "ready") return;
    if (!visibleItems.some((item) => item.id === selectedId)) {
      setSelectedId(visibleItems.find((item) => item.status === "unread")?.id ?? visibleItems[0]?.id);
    }
  }, [loadState.status, selectedId, visibleItems]);

  return (
    <div className="notification-center">
      <aside className="notification-center__sidebar">
        <div className="notification-center__intro">
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <NotificationNavigation activeView={activeView} onViewChange={setActiveView} t={t} />
      </aside>

      <section className="notification-center__workspace">
        <header className="notification-toolbar">
          <div className="notification-toolbar__summary">
            <strong>{t("currentPageUnread", { count: unreadCount })}</strong>
            <span>{t("totalCount", { count: parseTotalItems(pageValue?.pageInfo.totalItems) })}</span>
          </div>
          <div className="notification-toolbar__actions">
            <label className="notification-search">
              <Search aria-hidden="true" size={16} />
              <span className="sr-only">{t("searchAria")}</span>
              <input
                aria-label={t("searchAria")}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("search")}
                type="search"
                value={query}
              />
            </label>
            <button aria-label={t("refresh")} className="icon-button" onClick={refresh} title={t("refresh")} type="button">
              <RefreshCw aria-hidden="true" size={17} />
            </button>
          </div>
        </header>

        <div className="notification-center__content">
          <section className="notification-center__list-pane" aria-label={t("results")}>
            {loadState.status === "loading" ? <NotificationLoading t={t} /> : null}
            {loadState.status === "error" ? <NotificationError kind={loadState.kind} onRetry={refresh} t={t} /> : null}
            {loadState.status === "ready" && visibleItems.length === 0
              ? <NotificationEmpty filtered={Boolean(query.trim()) || activeView !== "all"} t={t} />
              : null}
            {loadState.status === "ready" && visibleItems.length > 0 ? (
              <NotificationList
                items={visibleItems}
                locale={locale}
                onSelect={(item: MessagingNotification) => setSelectedId(item.id)}
                selectedId={selectedId}
                t={t}
              />
            ) : null}

            {pageValue && (pageValue.pageInfo.totalPages ?? 0) > 1 ? (
              <footer className="notification-pagination">
                <button aria-label={t("previous")} className="icon-button" disabled={page <= 1} onClick={() => setPage(page - 1)} title={t("previous")} type="button">
                  <ChevronLeft aria-hidden="true" size={17} />
                </button>
                <span>{t("page", { current: pageValue.pageInfo.page ?? 1, total: pageValue.pageInfo.totalPages ?? 0 })}</span>
                <button aria-label={t("next")} className="icon-button" disabled={page >= (pageValue.pageInfo.totalPages ?? 0)} onClick={() => setPage(page + 1)} title={t("next")} type="button">
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              </footer>
            ) : null}
          </section>

          <section className="notification-center__detail-pane" aria-label={t("details")}>
            <NotificationDetail
              locale={locale}
              marking={markingId === selected?.id}
              notification={selected}
              onMarkRead={(id) => { void markRead(id); }}
              t={t}
            />
          </section>
        </div>
      </section>
    </div>
  );
}
