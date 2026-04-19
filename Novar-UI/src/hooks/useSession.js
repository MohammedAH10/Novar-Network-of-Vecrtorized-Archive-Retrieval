import { useState, useCallback, useRef } from "react";
import { uploadDocument, streamChat, deleteSession } from "../lib/api";

export function useSession() {
  const [sessionId, setSessionId] = useState(null);
  const [files, setFiles] = useState([]); // { id, name, chunks, status }
  const [messages, setMessages] = useState([]); // { id, role, content, sources?, streaming? }
  const [uploading, setUploading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const clearError = useCallback(() => setError(null), []);

  // ---------------------------------------------------------------- //
  // Upload
  // ---------------------------------------------------------------- //
  const upload = useCallback(
    async (fileList) => {
      setError(null);
      setUploading(true);

      let currentSessionId = sessionId;

      for (const file of fileList) {
        const tempId = crypto.randomUUID();
        setFiles((prev) => [
          ...prev,
          { id: tempId, name: file.name, chunks: null, status: "indexing" },
        ]);

        try {
          const res = await uploadDocument(file, currentSessionId);
          currentSessionId = res.session_id;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === tempId
                ? { ...f, chunks: res.chunks_indexed, status: "ready" }
                : f,
            ),
          );
        } catch (err) {
          setFiles((prev) =>
            prev.map((f) => (f.id === tempId ? { ...f, status: "error" } : f)),
          );
          setError(`Failed to index "${file.name}": ${err.message}`);
        }
      }

      setSessionId(currentSessionId);
      setUploading(false);
    },
    [sessionId],
  );

  // ---------------------------------------------------------------- //
  // Chat (streaming)
  // ---------------------------------------------------------------- //
  const chat = useCallback(
    async (message) => {
      if (!sessionId) return;
      setError(null);

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Append user message
      const userMsgId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: message },
      ]);

      // Reserve assistant message slot — content built token by token
      const assistantMsgId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          sources: [],
          streaming: true,
        },
      ]);

      setThinking(true);

      await streamChat(
        sessionId,
        message,
        {
          onSources(sources) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, sources } : m,
              ),
            );
          },
          onDelta(chunk) {
            setThinking(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + chunk }
                  : m,
              ),
            );
          },
          onDone() {
            setThinking(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, streaming: false } : m,
              ),
            );
          },
          onError(msg) {
            setThinking(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, role: "error", content: msg, streaming: false }
                  : m,
              ),
            );
            setError(msg);
          },
        },
        controller.signal,
      );
    },
    [sessionId],
  );

  // ---------------------------------------------------------------- //
  // Reset
  // ---------------------------------------------------------------- //
  const reset = useCallback(async () => {
    abortRef.current?.abort();
    if (sessionId) {
      try {
        await deleteSession(sessionId);
      } catch (_) {}
    }
    setSessionId(null);
    setFiles([]);
    setMessages([]);
    setError(null);
    setThinking(false);
    setUploading(false);
  }, [sessionId]);

  return {
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
  };
}
