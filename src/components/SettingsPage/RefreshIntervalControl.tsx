import { useAppDispatch, useAppState } from "../../context/AppStateContext";
import styles from "./SettingsPage.module.css";

const MIN_MS = 5000;
const MAX_MS = 60000;
const STEP_MS = 1000;

export function RefreshIntervalControl() {
  const { refreshIntervalMs } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Refresh interval</h2>
      <div className={styles.fieldRow}>
        <input
          type="range"
          className={styles.rangeInput}
          min={MIN_MS}
          max={MAX_MS}
          step={STEP_MS}
          value={refreshIntervalMs}
          onChange={(e) => dispatch({ type: "SET_REFRESH_INTERVAL", ms: Number(e.target.value) })}
        />
        <span className={styles.intervalValue}>{Math.round(refreshIntervalMs / 1000)}s</span>
      </div>
    </section>
  );
}
