import { useEffect, useState, type RefObject } from "react";

interface UseVisibleRowCountParams {
  /** The board's fill-the-viewport container. */
  containerRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  /** Null when no disruption banner is currently rendered. */
  bannerRef: RefObject<HTMLElement | null>;
  /** A real (or hidden same-markup sizer) row — used purely to measure
   * actual rendered row height rather than parsing the CSS clamp() driving
   * it, which would need duplicating the sizing math in JS. */
  rowRef: RefObject<HTMLElement | null>;
  /** How many rows are available to show, i.e. the API `limit` — the
   * computed count is capped here so we never claim more rows exist than
   * were fetched. */
  totalFetched: number;
}

const DEBOUNCE_MS = 150;

/**
 * Computes how many whole DepartureRows fit the current available height.
 * Floors rather than rounds so a partial row is never rendered, and floors
 * to a minimum of 1 even on a viewport too small to comfortably fit one —
 * per spec, showing one tight row beats showing none.
 */
export function useVisibleRowCount({
  containerRef,
  headerRef,
  bannerRef,
  rowRef,
  totalFetched,
}: UseVisibleRowCountParams): number {
  const [rowCount, setRowCount] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recompute = () => {
      const row = rowRef.current;
      if (!container || !row) return;
      const rowHeight = row.getBoundingClientRect().height;
      if (rowHeight <= 0) return;

      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
      const bannerHeight = bannerRef.current?.getBoundingClientRect().height ?? 0;
      const available = container.clientHeight - headerHeight - bannerHeight;

      const count = Math.floor(available / rowHeight);
      setRowCount(Math.max(1, Math.min(count, Math.max(totalFetched, 1))));
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedRecompute = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(recompute, DEBOUNCE_MS);
    };

    recompute();

    // ResizeObserver on the board container (not `window`) so this stays
    // correct if the board is ever embedded in a fixed-size kiosk container
    // rather than filling the whole browser viewport.
    const resizeObserver = new ResizeObserver(debouncedRecompute);
    resizeObserver.observe(container);
    window.addEventListener("orientationchange", debouncedRecompute);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", debouncedRecompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalFetched, bannerRef.current]);

  return rowCount;
}
