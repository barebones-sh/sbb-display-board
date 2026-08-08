import { useEffect, useMemo, useState } from "react";
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
 */
export function useStationboard(
  apiStationName: string | null,
  viewMode: ViewMode,
  limit: number,
  refreshIntervalMs: number,
  trainsOnly: boolean,
): UseStationboardResult {
  const { language } = useAppState();
  const [entries, setEntries] = useState<StationboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!apiStationName) {
      setEntries([]);
      return;
    }

    let cancelled = false;
    let controller: AbortController | null = null;

    const poll = async () => {
      // Abort any still-in-flight request rather than letting a slow
      // response land after a newer one — protects against pileup if a
      // fetch takes longer than the refresh interval.
      controller?.abort();
      controller = new AbortController();
      setIsLoading(true);
      try {
        const response = await fetchStationboard(
          apiStationName,
          viewMode,
          limit,
          trainsOnly,
          controller.signal,
        );
        if (cancelled) return;
        setEntries(response.stationboard);
        setError(null);
      } catch (err) {
        if (cancelled || (err as Error).name === "AbortError") return;
        setError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    poll();
    const intervalId = setInterval(poll, refreshIntervalMs);

    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(intervalId);
    };
  }, [apiStationName, viewMode, limit, refreshIntervalMs, trainsOnly]);

  const rows = useMemo(() => mapStationboard(entries, language), [entries, language]);

  return { rows, isLoading, error };
}
