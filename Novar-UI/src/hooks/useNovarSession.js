import { useCallback, useEffect, useRef, useState } from "react";
import { deleteSession, getSessionFiles, streamChat, uploadDocument } from "../lib/api";

const STORAGE_KEY = "novar-session-v1";

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(kb))} KB`;
}

export function fileMeta(name, chunks = null, size = 0) {
  const isPdf = /\.pdf$/i.test(name);
  const isNote = /\.(md|txt)$/i.test(name);
  return {
    name,
    chunks,
    size,
    icon: isPdf ? "pdf" : isNote ? "note" : "doc",
    tone: isPdf ? "rose" : isNote ? "amber" : "violet",
  };
}

function markFile(files, id, patch) {
  return files.map((f) => (f.id === id ? { ...f, ...patch } : f));
}

export function useNovarSession() {
  const stored = loadStored();
  const [sessionId, setSessionId] = useState(stored?.sessionId ?? null);
  const [files, setFiles] = useState(stored?.files ?? []);
  const [messages, setMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const clearError = useCallback(() => setError(null), []);

  // Persist the session between reloads.
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, files }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [sessionId, files]);

  // If a stored session has no locally-cached files, restore its names from the backend.
  useEffect(() => {
    if (!sessionId || files.length > 0) return;
    getSessionFiles(sessionId)
      .then((res) => {
        const restored = (res.files ?? []).map((name, i) => ({
          id: `restored-${i}-${name}`,
          status: "Ready",
          ...fileMeta(name),
        }));
        if (restored.length) setFiles(restored);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const upload = useCallback(async (fileList) => {
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    setError(null);
    setUploading(true);

    let currentSessionId = sessionIdRef.current;

    for (const file of incoming) {
      const tempId = `upload-${Date.now()}-${file.name}`;
      setFiles((prev) => [
        {
          id: tempId,
          status: "Indexing",
          ...fileMeta(file.name, null, file.size || 0),
        },
        ...prev,
      ]);

      try {
        const res = await uploadDocument(file, currentSessionId);
        currentSessionId = res.session_id;
        setFiles((prev) =>
          markFile(prev, tempId, {
            status: "Ready",
            chunks: res.chunks_indexed,
            size: file.size || 0,
          }),
        );
      } catch (err) {
        setFiles((prev) => markFile(prev, tempId, { status: "Error" }));
        setError(`Failed to index "${file.name}": ${err.message}`);
      }
    }

    if (currentSessionId && currentSessionId !== sessionIdRef.current) {
      setSessionId(currentSessionId);
      sessionIdRef.current = currentSessionId;
    }
    setUploading(false);
  }, []);

  const chat = useCallback(
    async (message) => {
      const current = sessionIdRef.current;
      if (!current || thinking) return;
      setError(null);

      // Cancel any in-flight request, then reserve an assistant slot.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: message },
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
        current,
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
                m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m,
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
    [thinking],
  );

  const reset = useCallback(async () => {
    abortRef.current?.abort();
    if (sessionIdRef.current) {
      try {
        await deleteSession(sessionIdRef.current);
      } catch {
        /* already gone */
      }
    }
    sessionIdRef.current = null;
    setSessionId(null);
    setFiles([]);
    setMessages([]);
    setError(null);
    setThinking(false);
    setUploading(false);
  }, []);

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