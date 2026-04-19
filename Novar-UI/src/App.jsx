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
    ? "upload a document first..."
    : uploading
      ? "indexing..."
      : "ask a question about your documents...";

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <header className={styles.sidebarHeader}>
          <h1 className={styles.wordmark}>
            <span className={styles.wordmarkAccent}>nb</span>
            <span className={styles.wordmarkDot}>.</span>
            lite
          </h1>
          <p className={styles.tagline}>document intelligence</p>
        </header>

        <div className={styles.sidebarSection}>
          <UploadZone onFiles={upload} disabled={uploading} />
        </div>

        {files.length > 0 && (
          <div className={styles.sidebarSection}>
            <span className={styles.sectionLabel}>sources</span>
            <FileList files={files} />
          </div>
        )}

        {hasSession && (
          <div className={styles.sidebarFooter}>
            <div className={styles.sessionInfo}>
              <span className={styles.sectionLabel}>session</span>
              <span className={styles.sessionId} title={sessionId}>
                {sessionId.slice(0, 8)}...
              </span>
            </div>
            <button className={styles.resetBtn} onClick={reset}>
              clear session
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.chatArea}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>
                {hasSession
                  ? "session ready — ask anything"
                  : "upload a document to begin"}
              </p>
              {!hasSession && (
                <p className={styles.emptyHint}>
                  supported formats: pdf, epub, txt, docx
                </p>
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
            <span>{error}</span>
            <button
              className={styles.errorDismiss}
              onClick={clearError}
              aria-label="Dismiss"
            >
              x
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
