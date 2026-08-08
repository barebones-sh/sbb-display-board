import type { StationboardResponse, ViewMode } from "../types/stationboard";

const BASE_URL = "https://transport.opendata.ch/v1/stationboard";

export async function fetchStationboard(
  stationName: string,
  viewMode: ViewMode,
  limit: number,
  signal?: AbortSignal,
): Promise<StationboardResponse> {
  const url = new URL(BASE_URL);
  url.searchParams.set("station", stationName);
  url.searchParams.set("type", viewMode);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Stationboard request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as StationboardResponse;
}
