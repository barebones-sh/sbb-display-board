import { memo } from "react";
import type { DisplayRow } from "../../types/stationboard";
import { LineBadge } from "../LineBadge/LineBadge";
import { useTranslation } from "../../i18n/useTranslation";
import styles from "./DepartureRow.module.css";

interface DepartureRowProps {
  row: DisplayRow;
  /** True only for the off-screen sizer instance in Board.tsx, which has no
   * parent grid to subgrid its columns into. Swaps .row to a self-contained
   * column template instead — see DepartureRow.module.css's .standalone. */
  standalone?: boolean;
}

function AirplaneIcon() {
  return (
    <svg className={styles.airplane} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2.5 2v1.5l4-1 4 1V21l-2.5-2v-5.5z" />
    </svg>
  );
}

function DepartureRowImpl({ row, standalone = false }: DepartureRowProps) {
  const { t } = useTranslation();

  // .row and (when present) .reroute must be direct children of the shared
  // grid to subgrid into it — no wrapper div here (a wrapper would sit
  // between them and the grid). The divider border lives on whichever one
  // is visually last: .reroute when there is one, .row otherwise.
  const rowClassName = [styles.row, standalone && styles.standalone, row.rerouteText && styles.noDivider]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={rowClassName}>
        <span className={styles.lead}>
          <LineBadge category={row.lineCategory} number={row.lineNumber} />
          <span className={styles.time}>{row.time}</span>
        </span>

        <span className={styles.destination}>
          <span className={styles.destName}>{row.destination}</span>
          {row.isAirport && <AirplaneIcon />}
          {row.viaStops.length > 0 && (
            <>
              <span className={styles.viaLabel}>{t("via")}</span>
              {row.viaStops.map((stop, i) => (
                // Index included: a looping tram/bus route can legitimately
                // pass through the same stop name twice in one via-list.
                <span key={`${stop}-${i}`} className={styles.viaStop}>
                  {stop}
                </span>
              ))}
            </>
          )}
        </span>

        <span className={styles.platform}>{row.platformTrack}</span>

        {/* Always rendered, even when there's no sector for this row —
         * it's its own fixed-width column now, so it must always occupy
         * that 4th cell for the subgrid to stay aligned across rows. */}
        <span className={styles.sector}>{row.platformSector}</span>

        <span className={styles.remarks}>
          {row.cancelled ? (
            <span className={styles.cancelTag}>{t("cancelled")}</span>
          ) : row.delayMinutes ? (
            <span className={styles.delayText}>
              {/* Both rendered; CSS toggles which is visible per viewport
               * width — see .delayFull/.delayShort in DepartureRow.module.css.
               * +N' needs no translation, unlike the full sentence. */}
              <span className={styles.delayFull}>
                {t("delayTemplate", { n: row.delayMinutes })}
              </span>
              <span className={styles.delayShort}>{`+${row.delayMinutes}'`}</span>
            </span>
          ) : null}
        </span>
      </div>

      {row.rerouteText && <div className={styles.reroute}>{row.rerouteText}</div>}
    </>
  );
}

/**
 * Memoized on the fields that actually affect render output — not the
 * DisplayRow object's identity, since useStationboard/mapStationboard
 * produces a fresh object every poll tick even when nothing in it changed.
 * This (plus the stable `id`-based key used where DepartureRow is rendered)
 * is what makes an unpolled/unchanged row skip re-render work; see
 * docs/ARCHITECTURE.md.
 */
function areEqual(prev: DepartureRowProps, next: DepartureRowProps) {
  const a = prev.row;
  const b = next.row;
  return (
    a.id === b.id &&
    a.time === b.time &&
    a.lineLabel === b.lineLabel &&
    a.destination === b.destination &&
    a.platformTrack === b.platformTrack &&
    a.platformSector === b.platformSector &&
    a.delayMinutes === b.delayMinutes &&
    a.cancelled === b.cancelled &&
    a.rerouteText === b.rerouteText &&
    a.viaStops.length === b.viaStops.length &&
    a.viaStops.every((stop, i) => stop === b.viaStops[i])
  );
}

export const DepartureRow = memo(DepartureRowImpl, areEqual);
