'use client';

import { useEffect, useMemo, useState } from 'react';

type PaginationOptions = {
  totalCount: number;
  initialPageSize?: number;
  resetDeps?: ReadonlyArray<unknown>;
};

export function useAdminPagination({
  totalCount,
  initialPageSize = 20,
  resetDeps = [],
}: PaginationOptions) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, ...resetDeps]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [pageSize, totalCount],
  );

  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    pageStart,
    pageEnd,
    rangeFrom: pageStart,
    rangeTo: pageEnd - 1,
  };
}
