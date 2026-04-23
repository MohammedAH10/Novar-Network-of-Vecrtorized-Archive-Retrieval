// ThinkingIndicator.jsx — unchanged
import styles from "./ThinkingIndicator.module.css";

export function ThinkingIndicator() {
  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>ai</span>
      <span className={styles.dots}>
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}
