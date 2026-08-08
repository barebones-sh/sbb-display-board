import { useState } from "react";
import { useAppDispatch, useAppState } from "../../context/AppStateContext";
import { useLocationSearch } from "../../hooks/useLocationSearch";
import styles from "./SettingsPage.module.css";

export function StationsManager() {
  const { savedStations } = useAppState();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const { results } = useLocationSearch(query);

  const addStation = (name: string) => {
    dispatch({
      type: "ADD_STATION",
      station: { id: crypto.randomUUID(), name, apiStationName: name },
    });
    setQuery("");
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Saved stations</h2>

      <ul className={styles.stationList}>
        {savedStations.map((station, index) => (
          <li key={station.id} className={styles.stationRow}>
            <span className={styles.stationName}>{station.name}</span>
            <button
              type="button"
              className={styles.iconButton}
              disabled={index === 0}
              onClick={() => dispatch({ type: "MOVE_STATION", id: station.id, direction: "up" })}
              aria-label={`Move ${station.name} up`}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.iconButton}
              disabled={index === savedStations.length - 1}
              onClick={() =>
                dispatch({ type: "MOVE_STATION", id: station.id, direction: "down" })
              }
              aria-label={`Move ${station.name} down`}
            >
              ↓
            </button>
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => dispatch({ type: "REMOVE_STATION", id: station.id })}
              aria-label={`Remove ${station.name}`}
            >
              ✕
            </button>
          </li>
        ))}
        {savedStations.length === 0 && <li>No stations saved yet.</li>}
      </ul>

      <div className={styles.searchWrap}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Add a station by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <div className={styles.searchResults}>
            {results.map(
              (result) =>
                result.name && (
                  <button
                    key={result.id}
                    type="button"
                    className={styles.searchResultButton}
                    onClick={() => addStation(result.name!)}
                  >
                    {result.name}
                  </button>
                ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}
