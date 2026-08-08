import type { ViewMode } from "./stationboard";

export type Language = "en" | "fr" | "de" | "it";
export { type ViewMode };

export interface SavedStation {
  id: string;
  /** Display name shown in the settings list — may differ from apiStationName
   * if we ever want a friendlier label; today they're set equal on add. */
  name: string;
  /** The exact string passed as the `station` query param to the API. */
  apiStationName: string;
  /** Primary transport-mode icon from the `/v1/locations` search result at
   * add-time (e.g. "train", "tram", "bus", "ship"). `null` for stations
   * saved before this field existed, or when the search result carried no
   * icon — treated as a train station for `trainsOnly` filtering purposes,
   * matching prior (unconditional) behavior. */
  icon: string | null;
}

export interface AppState {
  /** Bump on breaking shape changes; see AppStateContext's migrate(). */
  version: 1;
  savedStations: SavedStation[];
  currentStationIndex: number;
  viewMode: ViewMode;
  language: Language;
  refreshIntervalMs: number;
  /** When true, only train services are requested from the API — buses/trams
   * sharing a stop cluster (e.g. Genève) are excluded. Defaults to true since
   * this app replicates a train station departure board. Only actually
   * applied when the current station is itself a train station — see
   * SavedStation.icon and Board.tsx's effectiveTrainsOnly. */
  trainsOnly: boolean;
}

export type Action =
  | { type: "CYCLE_STATION" }
  | { type: "TOGGLE_VIEW_MODE" }
  | { type: "CYCLE_LANGUAGE" }
  | { type: "SET_LANGUAGE"; language: Language }
  | { type: "SET_VIEW_MODE"; viewMode: ViewMode }
  | { type: "SET_TRAINS_ONLY"; trainsOnly: boolean }
  | { type: "SET_CURRENT_STATION_INDEX"; index: number }
  | { type: "ADD_STATION"; station: SavedStation }
  | { type: "REMOVE_STATION"; id: string }
  | { type: "MOVE_STATION"; id: string; direction: "up" | "down" }
  | { type: "SET_REFRESH_INTERVAL"; ms: number };
