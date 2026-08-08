import { Fragment, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../../context/AppStateContext";
import { useStationboard } from "../../hooks/useStationboard";
import { useVisibleRowCount } from "../../hooks/useVisibleRowCount";
import { HeaderBar } from "../HeaderBar/HeaderBar";
import { DisruptionBanner } from "../DisruptionBanner/DisruptionBanner";
import { DepartureRow } from "../DepartureRow/DepartureRow";
import type { DisplayRow } from "../../types/stationboard";
import styles from "./Board.module.css";

// Deliberately larger than any realistic visible row count so
// useVisibleRowCount always has enough fetched rows to slice from at any
// viewport size, without over-fetching absurdly.
const FETCH_LIMIT = 40;

// Rendered off-screen (see .sizerWrapper) purely to measure row height —
// content doesn't matter, only that it uses the same markup as a real row.
const SIZER_ROW: DisplayRow = {
  id: "__sizer__",
  lineCategory: "IC",
  lineNumber: "1",
  lineLabel: "IC1",
  time: "00:00",
  destination: "Sizer",
  isAirport: false,
  viaStops: [],
  platformTrack: "1",
  platformSector: null,
  delayMinutes: null,
  cancelled: false,
  rerouteText: null,
};

export function Board() {
  const { savedStations, currentStationIndex, viewMode, refreshIntervalMs, trainsOnly } =
    useAppState();
  const currentStation = savedStations[currentStationIndex] ?? null;
  // Memoized so useStationboard's cache-pruning effect only reruns on an
  // actual add/remove/reorder, not on every unrelated re-render.
  const savedStationIds = useMemo(() => savedStations.map((s) => s.id), [savedStations]);

  // The trainsOnly setting only makes sense at a train station — applying
  // it to a station that's itself a bus/tram/boat stop would hide the
  // stop's own service. `icon` is null for stations saved before this
  // field existed (or an ambiguous search result), which is treated as a
  // train station to preserve prior (unconditional) behavior.
  const effectiveTrainsOnly =
    trainsOnly && (currentStation?.icon == null || currentStation.icon === "train");

  const { rows, error } = useStationboard(
    currentStation?.id ?? null,
    currentStation?.apiStationName ?? null,
    viewMode,
    FETCH_LIMIT,
    refreshIntervalMs,
    effectiveTrainsOnly,
    savedStationIds,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const rowSizerRef = useRef<HTMLDivElement>(null);

  const rowCount = useVisibleRowCount({
    containerRef,
    headerRef,
    bannerRef,
    rowRef: rowSizerRef,
    totalFetched: rows.length,
  });

  const visibleRows = useMemo(() => rows.slice(0, rowCount), [rows, rowCount]);

  if (!currentStation) {
    return (
      <div className={styles.board}>
        <div className={styles.empty}>
          No station saved yet.
          <Link className={styles.emptyLink} to="/settings">
            Add one in Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.board} ref={containerRef}>
      <DisruptionBanner ref={bannerRef} />
      {/* HeaderBar and every DepartureRow are direct children here so they
       * can all subgrid into this one grid's columns — see .grid in
       * Board.module.css for why that's what makes column widths
       * auto-size to content instead of needing hand-tuned constants. */}
      <div className={styles.grid}>
        <HeaderBar ref={headerRef} />
        {/* Keyed on the station itself (not just its rows) so switching
         * stations always fully unmounts and remounts this whole subtree
         * instead of React reconciling it row-by-row against the previous
         * station's list. Row ids are already unique per station (see
         * mapStationboard.ts), so in principle per-row keys alone should be
         * enough — but reconciling two structurally-different fine-grained
         * keyed lists back-to-back (each DepartureRow is a memoized
         * Fragment with a variable 1–2 DOM children) was empirically found
         * to leave orphaned DOM nodes behind that React's own fiber tree no
         * longer references — confirmed via direct fiber-tree inspection:
         * the reconciled tree was always correct, but the real DOM
         * accumulated extra untracked rows from a previously-visited
         * station on every revisit. This outer key sidesteps that
         * incremental path entirely for cross-station switches, at the
         * cost of only ever skipping DepartureRow's memoized re-render
         * within one station's own poll-to-poll updates (unaffected, still
         * covered by DepartureRow's `areEqual` — see docs/ARCHITECTURE.md). */}
        <Fragment key={currentStation.id}>
          {visibleRows.length === 0 && error ? (
            <div className={styles.status}>Unable to load stationboard.</div>
          ) : (
            visibleRows.map((row) => <DepartureRow key={row.id} row={row} />)
          )}
        </Fragment>
      </div>
      <div className={styles.sizerWrapper}>
        {/* Rendered outside the real grid, so it has no parent grid to
         * subgrid into — `standalone` gives it a self-contained column
         * template instead. Row height doesn't depend on column widths
         * (nothing wraps), so this still measures a representative height. */}
        <div ref={rowSizerRef}>
          <DepartureRow row={SIZER_ROW} standalone />
        </div>
      </div>
    </div>
  );
}
