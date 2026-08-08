import { Link } from "react-router-dom";
import { StationsManager } from "./StationsManager";
import { DefaultsSection } from "./DefaultsSection";
import { RefreshIntervalControl } from "./RefreshIntervalControl";
import styles from "./SettingsPage.module.css";

function NewTabIcon() {
  return (
    <svg className={styles.newTabIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
      <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z" />
    </svg>
  );
}

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

      <footer className={styles.footer}>
        <div>Vibe-coded with ♥︎ by barebones-sh in Geneva.</div>
        <div className={styles.footerLinks}>
          <a
            className={styles.footerLink}
            href="https://github.com/barebones-sh/sbb-display-board"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
            <NewTabIcon />
          </a>
          <a
            className={styles.footerLink}
            href="https://barebones-sh.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            Website
            <NewTabIcon />
          </a>
        </div>
      </footer>
    </div>
  );
}
