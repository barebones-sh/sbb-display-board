/** Airport stations follow a consistent "<City>-<Aéroport/Flughafen/...>"
 * naming pattern across SBB/CFF/FFS's own station names, so a substring
 * check on the untranslated API name is reliable without a lookup table. */
const AIRPORT_MARKERS = ["aéroport", "flughafen", "aeroporto", "airport"];

export function isAirportDestination(name: string): boolean {
  const lower = name.toLowerCase();
  return AIRPORT_MARKERS.some((marker) => lower.includes(marker));
}
