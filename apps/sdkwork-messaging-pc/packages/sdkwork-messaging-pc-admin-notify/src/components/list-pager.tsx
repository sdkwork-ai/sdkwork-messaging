//! Server-driven pagination control for the notify admin lists
//! (PAGINATION_SPEC §8: render page controls from server pageInfo metadata).

import { useTranslation } from "react-i18next";
import { SecondaryButton } from "./form";

export interface ListPagerProps {
  page: number;
  totalPages: number;
  hasMore: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function ListPager({ page, totalPages, hasMore, onPrev, onNext }: ListPagerProps) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
      <span>
        {t("admin.notify.common.pageOf", {
          page,
          totalPages: Math.max(totalPages, page),
        })}
      </span>
      <div className="flex gap-2">
        <SecondaryButton onClick={onPrev} disabled={page <= 1}>
          {t("admin.notify.common.previous")}
        </SecondaryButton>
        <SecondaryButton onClick={onNext} disabled={!hasMore}>
          {t("admin.notify.common.next")}
        </SecondaryButton>
      </div>
    </div>
  );
}
