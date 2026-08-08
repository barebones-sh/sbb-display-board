/**
 * Shapes mirror the live response from transport.opendata.ch/v1/stationboard,
 * verified by hand against a real request (station=Bern) during bootstrap —
 * NOT copied from official docs, since the public docs are thin. Re-verify
 * against a live call if these ever look wrong.
 */

export interface Coordinate {
  type: string;
  x: number | null;
  y: number | null;
}

export interface StationRef {
  id: string;
  name: string | null;
  score: number | null;
  coordinate: Coordinate;
  distance: number | null;
}

export interface Prognosis {
  platform: string | null;
  arrival: string | null;
  departure: string | null;
  capacity1st: string | null;
  capacity2nd: string | null;
}

export interface StopPoint {
  station: StationRef;
  arrival: string | null;
  arrivalTimestamp: number | null;
  departure: string | null;
  departureTimestamp: number | null;
  /** Minutes late, API-computed, only reliably present once realtime data exists. */
  delay: number | null;
  /** e.g. "7A-D" — a track number with an optional sector suffix baked into
   * the same string. Parse with utils/platform.ts, don't assume a clean number. */
  platform: string | null;
  prognosis: Prognosis;
  /**
   * UNCONFIRMED FIELD: no "cancelled" field appears in the official API docs
   * or in any live response sampled during bootstrap. Present here defensively
   * in case a genuinely cancelled service does carry it — mapStationboard.ts
   * does not rely on this alone. See docs/DATA.md.
   */
  cancelled?: boolean;
}

export interface StationboardEntry {
  stop: StopPoint;
  /** Internal train number, e.g. "000749" — NOT a rider-facing line code. */
  name: string;
  /** "IC" | "IR" | "RE" | "S" | "SN" | ... — kept as an open string since
   * regional operators introduce categories this app can't enumerate. */
  category: string;
  subcategory: string | null;
  categoryCode: string | null;
  /** Route number, e.g. "1", "15", "90" — sometimes letter-prefixed ("N1"). */
  number: string;
  operator: string;
  to: string;
  passList: StopPoint[];
  capacity1st: string | null;
  capacity2nd: string | null;
}

export interface StationboardResponse {
  station: StationRef;
  stationboard: StationboardEntry[];
}

export type ViewMode = "departure" | "arrival";

/**
 * View model produced by api/mapStationboard.ts and consumed by DepartureRow.
 * Keeps components free of API-shape knowledge and free of the delay/cancel/
 * platform-parsing heuristics, which all live in one place.
 */
export interface DisplayRow {
  /** Stable across polls as long as the same physical service is still in
   * the fetched window — used as the React list key. */
  id: string;
  lineCategory: string;
  lineNumber: string;
  /** category + number, e.g. "IC1" — see LineBadge for rendering. */
  lineLabel: string;
  /** Forced 24h "HH:MM". */
  time: string;
  destination: string;
  isAirport: boolean;
  viaStops: string[];
  platformTrack: string | null;
  platformSector: string | null;
  delayMinutes: number | null;
  cancelled: boolean;
  /**
   * MOCKED: transport.opendata.ch has no field for rerouting instructions.
   * Populated from src/mock/disruptions.ts by destination-name match, not
   * from any real per-train source. See docs/DATA.md.
   */
  rerouteText: string | null;
}
