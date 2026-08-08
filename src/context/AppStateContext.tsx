import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Action, AppState, Language } from "../types/appState";
import { getInputSource } from "../input";

const STORAGE_KEY = "sbb-board-state.v1";
const LANGUAGE_ORDER: Language[] = ["en", "fr", "de", "it"];

const DEFAULT_STATE: AppState = {
  version: 1,
  savedStations: [],
  currentStationIndex: 0,
  viewMode: "departure",
  language: "en",
  refreshIntervalMs: 20_000,
  trainsOnly: true,
};

/**
 * Reads persisted state, tolerating anything that doesn't parse or match the
 * current schema version rather than crashing the app on a stale/corrupt
 * localStorage value. Bump DEFAULT_STATE.version and add a migrate() step
 * here (rather than editing this function's guard) the next time the shape
 * changes in a breaking way.
 */
function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed.version !== 1) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function clampStationIndex(index: number, count: number): number {
  if (count === 0) return 0;
  return ((index % count) + count) % count;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "CYCLE_STATION": {
      if (state.savedStations.length === 0) return state;
      return {
        ...state,
        currentStationIndex: clampStationIndex(
          state.currentStationIndex + 1,
          state.savedStations.length,
        ),
      };
    }
    case "TOGGLE_VIEW_MODE":
      return {
        ...state,
        viewMode: state.viewMode === "departure" ? "arrival" : "departure",
      };
    case "CYCLE_LANGUAGE": {
      const next =
        LANGUAGE_ORDER[
          (LANGUAGE_ORDER.indexOf(state.language) + 1) % LANGUAGE_ORDER.length
        ];
      return { ...state, language: next };
    }
    case "SET_LANGUAGE":
      return { ...state, language: action.language };
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.viewMode };
    case "SET_TRAINS_ONLY":
      return { ...state, trainsOnly: action.trainsOnly };
    case "SET_CURRENT_STATION_INDEX":
      return {
        ...state,
        currentStationIndex: clampStationIndex(
          action.index,
          state.savedStations.length,
        ),
      };
    case "ADD_STATION":
      return {
        ...state,
        savedStations: [...state.savedStations, action.station],
      };
    case "REMOVE_STATION": {
      const nextStations = state.savedStations.filter(
        (station) => station.id !== action.id,
      );
      return {
        ...state,
        savedStations: nextStations,
        currentStationIndex: clampStationIndex(
          state.currentStationIndex,
          nextStations.length,
        ),
      };
    }
    case "MOVE_STATION": {
      const index = state.savedStations.findIndex((s) => s.id === action.id);
      const swapWith = action.direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= state.savedStations.length) {
        return state;
      }
      const nextStations = [...state.savedStations];
      [nextStations[index], nextStations[swapWith]] = [
        nextStations[swapWith],
        nextStations[index],
      ];
      return { ...state, savedStations: nextStations };
    }
    case "SET_REFRESH_INTERVAL":
      return { ...state, refreshIntervalMs: action.ms };
    default:
      return state;
  }
}

const AppStateStateContext = createContext<AppState | null>(null);
const AppStateDispatchContext = createContext<Dispatch<Action> | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // The one place hardware (or keyboard-stub) input turns into state
  // changes — see src/input/InputSource.ts for why this is the only spot
  // that calls getInputSource().
  useEffect(() => {
    const unsubscribe = getInputSource().subscribe((button) => {
      switch (button) {
        case "cycleStation":
          dispatch({ type: "CYCLE_STATION" });
          break;
        case "toggleViewMode":
          dispatch({ type: "TOGGLE_VIEW_MODE" });
          break;
        case "cycleLanguage":
          dispatch({ type: "CYCLE_LANGUAGE" });
          break;
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AppStateStateContext.Provider value={state}>
      <AppStateDispatchContext.Provider value={dispatch}>
        {children}
      </AppStateDispatchContext.Provider>
    </AppStateStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const state = useContext(AppStateStateContext);
  if (!state) throw new Error("useAppState must be used within AppStateProvider");
  return state;
}

export function useAppDispatch(): Dispatch<Action> {
  const dispatch = useContext(AppStateDispatchContext);
  if (!dispatch) throw new Error("useAppDispatch must be used within AppStateProvider");
  return dispatch;
}
