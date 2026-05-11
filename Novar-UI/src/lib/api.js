const BASE = import.meta.env.VITE_API_BASE_URL || ""; // empty string keeps local Vite proxy working

export async function uploadDocument(file, sessionId = null) {
  const form = new FormData();
  form.append("file", file);
  if (sessionId) form.append("session_id", sessionId);

  let res;
  try {
    res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  } catch (err) {
    throw new Error(
      err.message?.includes("NetworkError")
        ? "Could not reach the backend while indexing. Check that FastAPI is still running on port 8000."
        : (err.message ?? "Network error"),
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Upload failed");
  }
  return res.json();
}

export async function sendChat(sessionId, message) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Chat request failed");
  }
  return res.json();
}

/**
 * Open a streaming chat request. Calls callbacks as SSE events arrive.
 *
 * @param {string} sessionId
 * @param {string} message
 * @param {{ onSources, onDelta, onDone, onError }} callbacks
 * @param {AbortSignal} [signal]
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
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    onError?.(err.detail ?? "Stream request failed");
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
    buffer = parts.pop(); // keep incomplete trailing chunk

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
          } catch (_) {}
          break;
        case "delta":
          // Unescape newlines that were escaped server-side
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
  const res = await fetch(`${BASE}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Delete failed");
  }
  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}
