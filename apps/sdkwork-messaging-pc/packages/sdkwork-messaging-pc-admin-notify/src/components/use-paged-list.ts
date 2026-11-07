//! Shared server-pagination state for the notify admin lists
//! (PAGINATION_SPEC §7/§8: one server page at a time, page controls rendered
//! from server pageInfo metadata).

import { useCallback, useRef, useState } from "react";

export const NOTIFY_PAGE_SIZE = 20;

export interface PagedFetchResult<Row> {
  items: Row[];
  totalPages: number;
  hasMore: boolean;
}

export function usePagedList<Row>(
  fetchPage: (page: number) => Promise<PagedFetchResult<Row>>,
) {
  const [items, setItems] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState({ totalPages: 0, hasMore: false });
  const pageRef = useRef(1);

  const load = useCallback(
    async (targetPage: number) => {
      const result = await fetchPage(targetPage);
      setItems(result.items);
      setPageMeta({ totalPages: result.totalPages, hasMore: result.hasMore });
      pageRef.current = targetPage;
      setPage(targetPage);
    },
    [fetchPage],
  );

  const reload = useCallback(() => load(pageRef.current), [load]);

  return { items, page, pageMeta, load, reload };
}
