// Lightweight client for the Novar FastAPI backend.
// BASE is empty in local dev (the Vite proxy forwards /upload, /chat, /sessions, /health
// to localhost:8000) and overridden by VITE_API_BASE_URL in production.
const BASE = import.meta.env.VITE_API_BASE_URL || "";

async function readError(res) {
  try {
    const body = await res.json();
    return body?.detail ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function uploadDocument(file, sessionId = null) {
  const form = new FormData();
  form.append("file", file);
  if (sessionId) form.append("session_id", sessionId);

  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return res.json();
}

export async function getSessionFiles(sessionId) {
  const res = await fetch(`${BASE}/sessions/${sessionId}/files`);
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return res.json();
}

/**
 * Open a streaming chat request. Calls callbacks as SSE events arrive.
 *
 * Event types emitted by the backend:
 *  - sources: JSON array of retrieved source filenames
 *  - delta: incremental answer chunks (newlines escaped as \n)
 *  - done: stream complete
 *  - error: something went wrong
 */
export async function streamChat(sessionId, message, callbacks, signal) {
  const { onSources, onDelta, onDone, onError } = callbacks;

  let res;
  try {
    res = await fetch(`${BASE}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message }),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") return;
    onError?.(err.message ?? "Network error");
    return;
  }

  if (!res.ok) {
    onError?.(await readError(res));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    let done, value;
    try {
      ({ done, value } = await reader.read());
    } catch (err) {
      if (err.name === "AbortError") return;
      onError?.(err.message);
      return;
    }

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by double newlines
    const parts = buffer.split("\n\n");
    buffer = parts.pop();

    for (const part of parts) {
      const lines = part.trim().split("\n");
      let event = "message";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data = line.slice(6);
      }

      if (!data) continue;

      switch (event) {
        case "sources":
          try {
            onSources?.(JSON.parse(data));
          } catch {
            /* ignore malformed payloads */
          }
          break;
        case "delta":
          onDelta?.(data.replace(/\\n/g, "\n"));
          break;
        case "done":
          onDone?.();
          break;
        case "error":
          onError?.(data);
          return;
      }
    }
  }
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${BASE}/sessions/${sessionId}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return res.json();
}

export async function checkHealth() {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}