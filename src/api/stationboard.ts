import type { StationboardResponse, ViewMode } from "../types/stationboard";

const BASE_URL = "https://transport.opendata.ch/v1/stationboard";

export async function fetchStationboard(
  stationName: string,
  viewMode: ViewMode,
  limit: number,
  trainsOnly: boolean,
  signal?: AbortSignal,
): Promise<StationboardResponse> {
  const url = new URL(BASE_URL);
  url.searchParams.set("station", stationName);
  url.searchParams.set("type", viewMode);
  url.searchParams.set("limit", String(limit));
  // Excludes buses/trams sharing a stop cluster with a train station (e.g.
  // Genève's "BK1+" SNCF bus) — verified server-side support by hand
  // against a live request, same as the shapes in types/stationboard.ts.
  if (trainsOnly) {
    url.searchParams.append("transportations[]", "train");
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Stationboard request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as StationboardResponse;
}
