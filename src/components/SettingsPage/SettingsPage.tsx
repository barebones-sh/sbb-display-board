import { Link } from "react-router-dom";
import { StationsManager } from "./StationsManager";
import { DefaultsSection } from "./DefaultsSection";
import { RefreshIntervalControl } from "./RefreshIntervalControl";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <Link className={styles.backLink} to="/">
          ← Back to board
        </Link>
      </div>

      <StationsManager />
      <DefaultsSection />
      <RefreshIntervalControl />
    </div>
  );
}
