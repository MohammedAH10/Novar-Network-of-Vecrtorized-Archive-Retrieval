import styles from "./ChatMessage.module.css";

export function ChatMessage({ message }) {
  const { role, content, sources, streaming } = message;

  return (
    <div className={`${styles.message} ${styles[role]}`}>
      <span className={styles.label}>
        {role === "user" ? "you" : role === "assistant" ? "ai" : "err"}
      </span>
      <div className={styles.body}>
        <p className={styles.content}>
          {content}
          {streaming && <span className={styles.cursor} aria-hidden="true" />}
        </p>
        {sources && sources.length > 0 && (
          <div className={styles.sources}>
            {sources.map((s) => (
              <span key={s} className={styles.source}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
