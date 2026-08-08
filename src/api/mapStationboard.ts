import type { StationboardEntry, DisplayRow } from "../types/stationboard";
import type { Language } from "../types/appState";
import { parsePlatform } from "../utils/platform";
import { formatHHMM } from "../utils/time";
import { isAirportDestination } from "../utils/station";
import { mockReroutes } from "../mock/disruptions";

function findRerouteText(destination: string, language: Language): string | null {
  const lower = destination.toLowerCase();
  const match = mockReroutes.find((r) => lower.includes(r.destinationMatch));
  return match ? match.text[language] : null;
}

/**
 * Converts raw API entries into the view model DepartureRow renders,
 * keeping every heuristic/gap in one place:
 *  - `cancelled` reads an unconfirmed field (see types/stationboard.ts) and
 *    will simply always be false until a real cancelled service is found
 *    to test against.
 *  - `rerouteText` is matched from mock/disruptions.ts by destination name,
 *    not from any real per-train field — the API has none. It's only
 *    populated for cancelled rows since there's no "rerouted but running"
 *    signal to key off either.
 *
 * `stationId` namespaces every row's id to the station it was fetched for.
 * Not load-bearing today (useStationboard caches entries per station, so
 * two stations' entries never share one array), but it's a cheap guard
 * against a future regression reintroducing a shared list where two
 * stations' ids could otherwise collide.
 */
export function mapStationboard(
  entries: StationboardEntry[],
  language: Language,
  stationId: string,
): DisplayRow[] {
  return entries.map((entry, index) => {
    const { stop } = entry;
    const scheduled = stop.departure ?? stop.arrival;
    const time = scheduled ? formatHHMM(new Date(scheduled)) : "--:--";
    const { track, sector } = parsePlatform(stop.prognosis.platform ?? stop.platform);
    const cancelled = stop.cancelled === true;
    const delayMinutes = stop.delay && stop.delay > 0 ? stop.delay : null;

    const viaStops = entry.passList
      .slice(1, -1)
      .map((point) => point.station.name)
      .filter((name): name is string => Boolean(name));

    // Falls back to the entry's position in the response, not a fixed
    // constant, so two entries in the same response that both lack
    // timestamps still get distinct ids instead of silently colliding
    // (this id then isn't stable across polls for such rows — acceptable,
    // since the previous `?? 0` behavior was strictly worse).
    const timestamp = stop.departureTimestamp ?? stop.arrivalTimestamp ?? `none-${index}`;

    return {
      id: `${stationId}:${entry.category}${entry.number}-${timestamp}`,
      lineCategory: entry.category,
      lineNumber: entry.number,
      lineLabel: `${entry.category}${entry.number}`,
      time,
      destination: entry.to,
      isAirport: isAirportDestination(entry.to),
      viaStops,
      platformTrack: track,
      platformSector: sector,
      delayMinutes,
      cancelled,
      rerouteText: cancelled ? findRerouteText(entry.to, language) : null,
    };
  });
}
