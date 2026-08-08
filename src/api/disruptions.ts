import type { MockDisruption } from "../mock/disruptions";

/**
 * Calls the local proxy in front of opentransportdata.swiss's SIRI-SX API
 * — see server/index.ts and docs/DATA.md. Unlike stationboard.ts and
 * locations.ts, this can't call the upstream API directly from the
 * browser: SIRI-SX needs a secret Bearer key and has tight per-key rate
 * limits, so the proxy holds the key and does the polling instead.
 */
const BASE_URL = "/api/disruptions";

/** `locationId` is the transport API's own UIC/DIDOK station id
 * (`SavedStation.locationId`), not this app's local `SavedStation.id` —
 * see that field's doc comment for why the distinction matters here. */
export async function fetchDisruptions(
  locationId: string,
  signal?: AbortSignal,
): Promise<MockDisruption[]> {
  const url = new URL(BASE_URL, window.location.origin);
  url.searchParams.set("locationId", locationId);

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Disruptions request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as MockDisruption[];
}
