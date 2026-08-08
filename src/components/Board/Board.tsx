import { useMemo, useRef } from "react";
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
  const { savedStations, currentStationIndex, viewMode, refreshIntervalMs } = useAppState();
  const currentStation = savedStations[currentStationIndex] ?? null;

  const { rows, error } = useStationboard(
    currentStation?.apiStationName ?? null,
    viewMode,
    FETCH_LIMIT,
    refreshIntervalMs,
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
        {visibleRows.length === 0 && error ? (
          <div className={styles.status}>Unable to load stationboard.</div>
        ) : (
          visibleRows.map((row) => <DepartureRow key={row.id} row={row} />)
        )}
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
