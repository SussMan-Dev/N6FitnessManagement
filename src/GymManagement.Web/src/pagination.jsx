import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { api } from './api';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SERVER_MAX_PAGE_SIZE = 100;

/**
 * Page/pageSize state that automatically jumps back to page 1 whenever any of
 * `resetKeys` changes (search text, filters, selected member…). The reset happens
 * during render, so no request is ever sent with a stale page number.
 */
export function usePagination(initialPageSize = 20, resetKeys = []) {
  const resetKey = JSON.stringify(resetKeys);
  const [state, setState] = useState({ page: 1, pageSize: initialPageSize, resetKey });

  if (state.resetKey !== resetKey) {
    setState(current => ({ ...current, page: 1, resetKey }));
  }

  const setPage = useCallback(page => setState(current => ({ ...current, page: Math.max(1, page) })), []);
  const setPageSize = useCallback(pageSize => setState(current => ({ ...current, pageSize, page: 1 })), []);

  return {
    page: state.resetKey === resetKey ? state.page : 1,
    pageSize: state.pageSize,
    setPage,
    setPageSize,
  };
}

/** Delays a fast-changing value (e.g. a search box) so we don't hit the API on every keystroke. */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Client-side slice for small, already-loaded lists. */
export function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** Builds `?page=..&pageSize=..&key=value` while skipping empty values. */
export function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return;
    search.set(key, String(value).trim());
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

/**
 * Loads every page of a paged endpoint (server caps pageSize at 100).
 * Only use for explicit bulk actions such as exports — never for rendering tables.
 */
export async function fetchAllPages(path, params = {}, maxPages = 50) {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await api(`${path}${buildQuery({ ...params, page, pageSize: SERVER_MAX_PAGE_SIZE })}`);
    const items = result?.items || [];
    all.push(...items);
    if (items.length < SERVER_MAX_PAGE_SIZE || all.length >= (result?.totalCount ?? 0)) break;
  }
  return all;
}

function getPageItems(current, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach(page => pages.add(page));
  if (current >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach(page => pages.add(page));
  const sorted = [...pages].filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push(`gap-${page}`);
    result.push(page);
  });
  return result;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  unit = 'bản ghi',
  disabled = false,
}) {
  const rootRef = useRef(null);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // If rows were deleted/filtered and the current page no longer exists, move to the last valid page.
  useEffect(() => {
    if (totalCount > 0 && page > totalPages) onPageChange(totalPages);
  }, [page, totalPages, totalCount, onPageChange]);

  if (!totalCount) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  function go(target) {
    const next = Math.min(Math.max(1, target), totalPages);
    if (next === page || disabled) return;
    onPageChange(next);
    const panel = rootRef.current?.closest('.table-panel, .work-panel');
    if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="pagination-bar" aria-label="Phân trang" ref={rootRef}>
      <div className="pagination-summary">
        Hiển thị <strong>{from}–{to}</strong> / <strong>{totalCount}</strong> {unit}
      </div>

      <div className="pagination-controls">
        <button type="button" className="pagination-btn" onClick={() => go(1)} disabled={disabled || page <= 1} aria-label="Trang đầu"><ChevronsLeft size={15} /></button>
        <button type="button" className="pagination-btn" onClick={() => go(page - 1)} disabled={disabled || page <= 1} aria-label="Trang trước"><ChevronLeft size={15} /></button>
        {getPageItems(page, totalPages).map(item => typeof item === 'number' ? (
          <button
            key={item}
            type="button"
            className={`pagination-btn ${item === page ? 'active' : ''}`}
            onClick={() => go(item)}
            disabled={disabled}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </button>
        ) : <span key={item} className="pagination-gap">…</span>)}
        <button type="button" className="pagination-btn" onClick={() => go(page + 1)} disabled={disabled || page >= totalPages} aria-label="Trang sau"><ChevronRight size={15} /></button>
        <button type="button" className="pagination-btn" onClick={() => go(totalPages)} disabled={disabled || page >= totalPages} aria-label="Trang cuối"><ChevronsRight size={15} /></button>
      </div>

      {onPageSizeChange && (
        <label className="pagination-size">
          <span>Mỗi trang</span>
          <select value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))} disabled={disabled}>
            {pageSizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      )}
    </nav>
  );
}
