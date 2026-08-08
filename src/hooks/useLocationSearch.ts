import { useEffect, useState } from "react";
import type { LocationResult } from "../types/locations";
import { searchLocations } from "../api/locations";
import { useDebouncedValue } from "./useDebouncedValue";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function useLocationSearch(query: string): {
  results: LocationResult[];
  isLoading: boolean;
} {
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (debouncedQuery.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    searchLocations(debouncedQuery, controller.signal)
      .then((stations) => setResults(stations))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setResults([]);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [debouncedQuery]);

  return { results, isLoading };
}
