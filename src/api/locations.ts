import type { LocationsResponse, LocationResult } from "../types/locations";

const BASE_URL = "https://transport.opendata.ch/v1/locations";

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<LocationResult[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("type", "station");

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Locations request failed: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as LocationsResponse;
  return data.stations;
}
