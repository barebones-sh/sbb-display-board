import type { Coordinate } from "./stationboard";

/** Response shape of transport.opendata.ch/v1/locations, used for the
 * settings-page station autocomplete. */
export interface LocationResult {
  id: string;
  name: string;
  score: number | null;
  coordinate: Coordinate;
  distance: number | null;
  icon: string | null;
}

export interface LocationsResponse {
  stations: LocationResult[];
}
