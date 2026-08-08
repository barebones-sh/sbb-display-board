import { forwardRef, useEffect, useState } from "react";
import { mockDisruptions, type MockDisruption } from "../../mock/disruptions";
import { useTranslation } from "../../i18n/useTranslation";
import styles from "./DisruptionBanner.module.css";

const ROTATE_MS = 8000;

interface DisruptionBannerProps {
  /** Defaults to the mocked sample data — see mock/disruptions.ts for why
   * this is mocked rather than fetched. Accepting it as a prop keeps this
   * component ready to receive real data with no internal changes once a
   * live feed is found. */
  disruptions?: MockDisruption[];
}

export const DisruptionBanner = forwardRef<HTMLDivElement, DisruptionBannerProps>(
  function DisruptionBanner({ disruptions = mockDisruptions }, ref) {
    const { t, language } = useTranslation();
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
      if (disruptions.length <= 1) return;
      const intervalId = setInterval(() => {
        setActiveIndex((i) => (i + 1) % disruptions.length);
      }, ROTATE_MS);
      return () => clearInterval(intervalId);
    }, [disruptions.length]);

    if (disruptions.length === 0) return null;
    const current = disruptions[activeIndex % disruptions.length];

    return (
      <div className={styles.banner} ref={ref}>
        <div className={styles.iconBox}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 2 3 14h7l-1 8 11-14h-7l0-6z" />
          </svg>
        </div>
        <div className={styles.text}>
          <span className={styles.label}>{t("disruptionLabel")} </span>
          {current.text[language]}
        </div>
        {disruptions.length > 1 && (
          <div className={styles.dots}>
            {disruptions.map((d, i) => (
              <span
                key={d.id}
                className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ""}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
