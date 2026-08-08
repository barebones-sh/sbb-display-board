import { useAppDispatch, useAppState } from "../../context/AppStateContext";
import type { Language, ViewMode } from "../../types/appState";
import styles from "./SettingsPage.module.css";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
];

export function DefaultsSection() {
  const { language, viewMode, trainsOnly } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Defaults</h2>

      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel} htmlFor="language-select">
          Language
        </label>
        <select
          id="language-select"
          className={styles.select}
          value={language}
          onChange={(e) => dispatch({ type: "SET_LANGUAGE", language: e.target.value as Language })}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>View mode</span>
        <div className={styles.radioGroup}>
          {(["departure", "arrival"] as ViewMode[]).map((mode) => (
            <label key={mode} className={styles.radioLabel}>
              <input
                type="radio"
                name="viewMode"
                checked={viewMode === mode}
                onChange={() => dispatch({ type: "SET_VIEW_MODE", viewMode: mode })}
              />
              {mode === "departure" ? "Departures" : "Arrivals"}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.radioLabel}>
          <input
            type="checkbox"
            checked={trainsOnly}
            onChange={(e) =>
              dispatch({ type: "SET_TRAINS_ONLY", trainsOnly: e.target.checked })
            }
          />
          Trains only (hide buses/trams)
        </label>
      </div>
    </section>
  );
}
