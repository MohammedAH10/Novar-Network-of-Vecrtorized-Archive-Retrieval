// FileList.jsx — no logic changes, purely visual
import styles from "./FileList.module.css";

const STATUS_LABEL = {
  indexing: "indexing...",
  ready: null,
  error: "failed",
};

export function FileList({ files }) {
  if (!files.length) return null;

  return (
    <ul className={styles.list}>
      {files.map((f) => (
        <li key={f.id} className={`${styles.item} ${styles[f.status]}`}>
          <span className={styles.name} title={f.name}>
            {f.name}
          </span>
          <span className={styles.meta}>
            {f.status === "ready" && f.chunks != null
              ? `${f.chunks} vectors`
              : STATUS_LABEL[f.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}
