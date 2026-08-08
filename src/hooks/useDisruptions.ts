import { useEffect, useRef, useState } from "react";
import type { MockDisruption } from "../mock/disruptions";
import { fetchDisruptions } from "../api/disruptions";

interface UseDisruptionsResult {
  disruptions: MockDisruption[];
  error: Error | null;
}

/**
 * Polls the local disruptions proxy (server/index.ts) on an interval,
 * mirroring useStationboard.ts's per-station cache + abort-in-flight-request
 * pattern exactly — see that file's comments for the reasoning (switching
 * stations must never show a lingering previous station's data, and a slow
 * response must never land after a newer one). The proxy itself, not this
 * hook, is what's rate-limited against the upstream API, so polling here
 * freely on the app's normal refresh cadence is safe.
 *
 * Keyed by `locationId` (the transport API's own UIC/DIDOK station id), not
 * `SavedStation.id` (this app's local identity) — an earlier pass conflated
 * the two, which silently broke station matching end-to-end. See
 * `SavedStation.locationId`'s doc comment and docs/DATA.md.
 */
export function useDisruptions(
  locationId: string | null,
  refreshIntervalMs: number,
  savedLocationIds: string[],
): UseDisruptionsResult {
  const [cache, setCache] = useState<Record<string, MockDisruption[]>>({});
  const [errorState, setErrorState] = useState<{ locationId: string; error: Error } | null>(null);

  const error = errorState?.locationId === locationId ? errorState.error : null;
  const requestSeqRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!locationId) return;

    let controller: AbortController | null = null;

    const poll = async () => {
      controller?.abort();
      controller = new AbortController();
      const seq = (requestSeqRef.current[locationId] ?? 0) + 1;
      requestSeqRef.current[locationId] = seq;
      try {
        const disruptions = await fetchDisruptions(locationId, controller.signal);
        if (requestSeqRef.current[locationId] !== seq) return;
        setCache((prev) => ({ ...prev, [locationId]: disruptions }));
        setErrorState(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (requestSeqRef.current[locationId] !== seq) return;
        // Leaves whatever was last cached on screen rather than blanking
        // the banner on a transient proxy hiccup.
        setErrorState({ locationId, error: err as Error });
      }
    };

    poll();
    const intervalId = setInterval(poll, refreshIntervalMs);

    return () => {
      clearInterval(intervalId);
      controller?.abort();
    };
  }, [locationId, refreshIntervalMs]);

  useEffect(() => {
    setCache((prev) => {
      const next: Record<string, MockDisruption[]> = {};
      let changed = false;
      for (const id of savedLocationIds) {
        if (id in prev) next[id] = prev[id];
      }
      for (const id in prev) {
        if (!(id in next)) changed = true;
      }
      return changed ? next : prev;
    });
  }, [savedLocationIds]);

  return { disruptions: locationId ? (cache[locationId] ?? []) : [], error };
}
