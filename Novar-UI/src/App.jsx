// App.jsx — updated branding & structure (silver/dark mode)
import { useEffect, useRef } from "react";
import { useSession } from "./hooks/useSession";
import { UploadZone } from "./components/UploadZone";
import { FileList } from "./components/FileList";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { ThinkingIndicator } from "./components/ThinkingIndicator";
import styles from "./App.module.css";

export default function App() {
  const {
    sessionId,
    files,
    messages,
    uploading,
    thinking,
    error,
    clearError,
    upload,
    chat,
    reset,
  } = useSession();

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const hasSession = Boolean(sessionId);
  const readyFiles = files.filter((f) => f.status === "ready");
  const canChat = hasSession && readyFiles.length > 0 && !uploading;

  const chatPlaceholder = !hasSession
    ? "upload documents to activate neural archive"
    : uploading
      ? "indexing vectors..."
      : "ask a question — context-aware AI";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <header className={styles.sidebarHeader}>
          <h1 className={styles.wordmark}>NOVAAR</h1>
          <p className={styles.tagline}>vector archive retrieval</p>
        </header>

        <div className={styles.sidebarSection}>
          <UploadZone onFiles={upload} disabled={uploading} />
        </div>

        {files.length > 0 && (
          <div className={styles.sidebarSection}>
            <span className={styles.sectionLabel}>knowledge sources</span>
            <FileList files={files} />
          </div>
        )}

        {hasSession && (
          <div className={styles.sidebarFooter}>
            <div className={styles.sessionInfo}>
              <span className={styles.sectionLabel}>session id</span>
              <span className={styles.sessionId} title={sessionId}>
                {sessionId.slice(0, 8)}...{sessionId.slice(-4)}
              </span>
            </div>
            <button className={styles.resetBtn} onClick={reset}>
              ✦ clear session
            </button>
          </div>
        )}
      </aside>

      <main className={styles.main}>
        <div className={styles.chatArea}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>
                {hasSession
                  ? "neural interface online — ask anything"
                  : "upload documents to initialize vector memory"}
              </p>
              {!hasSession && (
                <p className={styles.emptyHint}>PDF · EPUB · TXT · DOCX</p>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {thinking && <ThinkingIndicator />}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>⚠ {error}</span>
            <button
              className={styles.errorDismiss}
              onClick={clearError}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <div className={styles.inputRow}>
          <ChatInput
            onSend={chat}
            disabled={!canChat || thinking}
            placeholder={chatPlaceholder}
          />
        </div>
      </main>
    </div>
  );
}
