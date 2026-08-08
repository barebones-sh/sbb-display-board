import { forwardRef, useEffect, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { formatHHMMSS } from "../../utils/time";
import styles from "./HeaderBar.module.css";

/** forwardRef so Board can measure this bar's rendered height for
 * useVisibleRowCount without prop-drilling a callback. */
export const HeaderBar = forwardRef<HTMLDivElement>(function HeaderBar(_props, ref) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className={styles.header} ref={ref}>
      <span className={styles.clock}>{formatHHMMSS(now)}</span>
      <span className={styles.destination}>{t("columnDestination")}</span>
      <span className={styles.track}>{t("columnTrack")}</span>
      {/* No label — exists only so this subgrid's 5th column lines up with
       * every row's dedicated sector column beneath it. */}
      <span aria-hidden="true" />
      <span className={styles.remarks}>{t("columnRemarks")}</span>
    </div>
  );
});
