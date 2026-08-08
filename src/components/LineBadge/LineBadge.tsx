import { getBadgeVariant } from "./categoryStyles";
import styles from "./LineBadge.module.css";

interface LineBadgeProps {
  category: string;
  number: string;
}

export function LineBadge({ category, number }: LineBadgeProps) {
  const variant = getBadgeVariant(category);

  if (variant === "intercity") {
    return (
      <span className={`${styles.badge} ${styles.intercity}`}>
        <span className={styles.wordmark}>{category}</span>
        <span className={styles.number}>{number}</span>
      </span>
    );
  }

  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {category}
      {number}
    </span>
  );
}
