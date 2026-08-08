import { useEffect, useMemo, useRef, useState } from "react";
import type { StationboardEntry, ViewMode } from "../types/stationboard";
import { fetchStationboard } from "../api/stationboard";
import { mapStationboard } from "../api/mapStationboard";
import { useAppState } from "../context/AppStateContext";

interface UseStationboardResult {
  rows: ReturnType<typeof mapStationboard>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Polls the stationboard on an interval and keeps raw API entries in state
 * rather than the mapped DisplayRow[] — mapping happens in a useMemo below,
 * keyed on language too, so switching the UI language (a keydown "button"
 * press) updates mocked reroute text immediately instead of waiting for the
 * next ~20s poll tick.
 *
 * Entries and errors are cached per station (keyed by `stationId`, the
 * stable SavedStation.id) rather than kept in one shared buffer. `rows`/
 * `error` below are derived from that cache for whichever station is
 * current, not their own state — so the instant `stationId` changes, the
 * next render already reflects the new station's last-known data (or
 * nothing, if it's never been fetched) instead of the previous station's
 * rows lingering on screen for the duration of a fresh fetch.
 */
export function useStationboard(
  stationId: string | null,
  apiStationName: string | null,
  viewMode: ViewMode,
  limit: number,
  refreshIntervalMs: number,
  trainsOnly: boolean,
  savedStationIds: string[],
): UseStationboardResult {
  const { language } = useAppState();
  const [cache, setCache] = useState<Record<string, StationboardEntry[]>>({});
  const [errorState, setErrorState] = useState<{ stationId: string; error: Error } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const error = errorState?.stationId === stationId ? errorState.error : null;

  // Tracks the sequence number of the most recently *started* request per
  // station, across every past and present effect run — not just the
  // current one. A ref (not state) because bumping it must never itself
  // trigger a render; it only guards which in-flight response is allowed
  // to win.
  const requestSeqRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!stationId || !apiStationName) return;

    let controller: AbortController | null = null;

    const poll = async () => {
      // Abort any still-in-flight request for *this* station rather than
      // letting a slow response land after a newer one — protects against
      // pileup if a fetch takes longer than the refresh interval.
      controller?.abort();
      controller = new AbortController();
      const seq = (requestSeqRef.current[stationId] ?? 0) + 1;
      requestSeqRef.current[stationId] = seq;
      setIsLoading(true);
      try {
        const response = await fetchStationboard(
          apiStationName,
          viewMode,
          limit,
          trainsOnly,
          controller.signal,
        );
        // A newer request for this same station (from this effect run's
        // own next interval tick, or from a later revisit's fresh effect
        // run) has since started — don't let this older one overwrite it.
        if (requestSeqRef.current[stationId] !== seq) return;
        setCache((prev) => ({ ...prev, [stationId]: response.stationboard }));
        setErrorState(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (requestSeqRef.current[stationId] !== seq) return;
        // Deliberately doesn't touch `cache` — a failed refresh leaves
        // whatever was last cached for this station on screen instead of
        // going blank, with `error` surfaced alongside it.
        setErrorState({ stationId, error: err as Error });
      } finally {
        if (requestSeqRef.current[stationId] === seq) setIsLoading(false);
      }
    };

    poll();
    const intervalId = setInterval(poll, refreshIntervalMs);

    return () => {
      clearInterval(intervalId);
      // Aborting here (not just clearing the interval) guarantees at most
      // one station's request is ever in flight at a time — that's what
      // makes the `setCache((prev) => ({ ...prev, [stationId]: ... }))`
      // write above safe to reason about. Letting a switched-away-from
      // fetch keep running was tried and reverted: with two stations'
      // requests genuinely in flight concurrently, a cross-station data
      // leak was reproduced (one station's rows appearing prepended into
      // another's board, accumulating on every revisit) — worse than the
      // minor loss of an in-flight response when switching away quickly.
      controller?.abort();
    };
  }, [stationId, apiStationName, viewMode, limit, refreshIntervalMs, trainsOnly]);

  // Drops cache entries for stations no longer saved (e.g. after
  // REMOVE_STATION) so a long-running kiosk session doesn't accumulate
  // unbounded stale entries. Kept as its own effect, keyed only on the id
  // list, so it doesn't run on every poll tick.
  useEffect(() => {
    setCache((prev) => {
      const next: Record<string, StationboardEntry[]> = {};
      let changed = false;
      for (const id of savedStationIds) {
        if (id in prev) next[id] = prev[id];
      }
      for (const id in prev) {
        if (!(id in next)) changed = true;
      }
      return changed ? next : prev;
    });
  }, [savedStationIds]);

  // Reads `cache`/`stationId` directly (rather than through an intermediate
  // `entries` variable) so the memo's dependency is the cache object itself
  // — stable across renders that don't call setCache — instead of a fresh
  // `[]` literal on every render for a station with nothing cached yet.
  const rows = useMemo(
    () => mapStationboard(stationId ? cache[stationId] ?? [] : [], language, stationId ?? "none"),
    [cache, stationId, language],
  );

  return { rows, isLoading, error };
}
