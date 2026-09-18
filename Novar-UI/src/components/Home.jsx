import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  FileText,
  Library,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useNovarSession } from "../hooks/useNovarSession";

const starterPrompts = [
  "Summarize the documents in this library",
  "What are the main topics covered?",
];

function FileIcon({ type, tone }) {
  return (
    <div className={`file-icon file-icon-${tone}`}>
      {type === "pdf" ? <FileText size={17} /> : type === "doc" ? <BookOpen size={17} /> : <Library size={17} />}
    </div>
  );
}

function LogoMark() {
  return (
    <div className="logo-mark" aria-label="NOVAAR">
      <span />
      <span />
      <span />
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(kb))} KB`;
}

function formatAssistantText(content) {
  return content.split("\n").map((line, index) => {
    const pieces = line.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={`${line}-${index}`} className={line === "" ? "message-spacer" : undefined}>
        {pieces.map((piece, pieceIndex) =>
          piece.startsWith("**") && piece.endsWith("**") ? (
            <strong key={pieceIndex}>{piece.slice(2, -2)}</strong>
          ) : (
            piece
          ),
        )}
      </p>
    );
  });
}

export default function Home() {
  const {
    sessionId,
    files: documents,
    messages,
    uploading,
    thinking,
    error,
    clearError,
    upload,
    chat,
    reset,
  } = useNovarSession();
  const [activeNav, setActiveNav] = useState("Workspace");
  const [activeDocument, setActiveDocument] = useState(null);
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const pickFiles = () => fileInputRef.current?.click();
  const handleFiles = (fileList) => {
    if (!fileList?.length) return;
    void upload(fileList);
  };

  const handleClearSession = () => {
    void reset();
    toast.success("Session cleared");
  };

  const submitQuery = (value = query) => {
    const trimmed = value.trim();
    if (!trimmed || thinking || !canChat) return;
    setQuery("");
    void chat(trimmed);
  };

  const handleCopy = (content) => {
    if (!content) return;
    navigator.clipboard?.writeText(content);
    toast.success("Answer copied to clipboard");
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("library-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunks || 0), 0);
  const totalBytes = documents.reduce((sum, d) => sum + (d.size || 0), 0);
  const readyFiles = documents.filter((d) => d.status === "Ready");
  const canChat = Boolean(sessionId) && readyFiles.length > 0 && !uploading;
  const chatPlaceholder = !canChat
    ? "upload documents to activate vector memory"
    : "Ask anything about your library...";

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className={`workspace-rail ${mobileNavOpen ? "workspace-rail-open" : ""}`}>
        <div className="rail-topline">
          <div className="brand-lockup">
            <LogoMark />
            <div>
              <div className="brand-name">NOVAAR</div>
              <div className="brand-subtitle">vector archive retrieval</div>
            </div>
          </div>
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="rail-section-label">Workspace</div>
        <nav className="rail-nav" aria-label="Workspace navigation">
          {[
            { label: "Workspace", icon: Sparkles },
            { label: "Library", icon: Library, count: documents.length },
            { label: "Conversations", icon: MessageCircle, count: Math.floor(messages.length / 2) },
          ].map(({ label, icon: Icon, count }) => (
            <button
              key={label}
              className={`rail-nav-item ${activeNav === label ? "rail-nav-item-active" : ""}`}
              onClick={() => {
                setActiveNav(label);
                setMobileNavOpen(false);
              }}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {count ? <span className="nav-count">{count}</span> : null}
            </button>
          ))}
        </nav>

        <div className="rail-divider" />
        <div className="rail-section-label">Your spaces</div>
        <div className="space-list">
          <button className="space-item space-item-active">
            <span className="space-dot space-dot-coral" />
            <span>Novar space</span>
            <MoreHorizontal size={15} />
          </button>
          <button className="space-item">
            <span className="space-dot space-dot-lilac" />
            <span>Personal notes</span>
          </button>
          <button className="space-item space-add" onClick={() => toast("Create a new space is coming soon")}>
            <Plus size={15} />
            <span>New space</span>
          </button>
        </div>

        <div className="rail-bottom">
          <button className="rail-nav-item" onClick={() => toast("Settings are coming soon")}>
            <Settings size={17} strokeWidth={1.8} />
            <span>Settings</span>
          </button>
          <button className="rail-nav-item" onClick={() => toast("Help center is coming soon")}>
            <CircleHelp size={17} strokeWidth={1.8} />
            <span>Help center</span>
          </button>
          <div className="profile-card">
            <div className="profile-avatar">NV</div>
            <div className="profile-copy">
              <strong>Novar</strong>
              <span>Vector workspace</span>
            </div>
            <ChevronDown size={15} className="profile-chevron" />
          </div>
        </div>
      </aside>

      {mobileNavOpen ? <button className="rail-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}

      <main className="main-canvas">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
              <Menu size={19} />
            </button>
            <div className="breadcrumb"><span>Novar</span><ChevronDown size={13} /><strong>Workspace</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="status-pill"><span className="status-dot" /> In memory <span className="status-divider" /> {totalChunks.toLocaleString()} chunks</div>
            {sessionId ? (
              <button className="icon-button" aria-label="Clear session" onClick={handleClearSession} title="Clear session">
                <Trash2 size={16} />
              </button>
            ) : null}
            <button className="icon-button" aria-label="Notifications" onClick={() => toast("You are all caught up")}><Bell size={17} /></button>
            <button className="avatar-button" aria-label="Open profile menu">NV</button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="intro-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> Your workspace</div>
              <h1>Make sense of your <em>knowledge.</em></h1>
              <p className="intro-copy">Upload your source material, then ask NOVAAR to find the signal.</p>
            </div>
            <div className="intro-actions">
              <div className="shortcut-hint"><span className="keycap">⌘</span><span className="keycap">K</span><span>Search library</span></div>
              <button className="primary-button" onClick={pickFiles}><UploadCloud size={17} /> Add documents</button>
            </div>
          </section>

          <div className="workspace-grid">
            <section className="glass-panel library-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-kicker">Knowledge base <span className="live-badge">LIVE</span></div>
                  <h2>Your library <span className="heading-count">{documents.length}</span></h2>
                </div>
                <button className="small-icon-button" aria-label="More library actions" onClick={() => toast("Library actions are coming soon")}><MoreHorizontal size={18} /></button>
              </div>

              <div
                className={`drop-zone ${isDragging ? "drop-zone-active" : ""}`}
                onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleFiles(event.dataTransfer.files); }}
                onClick={pickFiles}
              >
                <div className="upload-orb"><UploadCloud size={20} /></div>
                <div className="drop-copy"><strong>{uploading ? "Indexing vectors…" : "Drop files to add context"}</strong><span>PDF, EPUB, TXT, DOCX</span></div>
                <button className="browse-button" onClick={(event) => { event.stopPropagation(); pickFiles(); }}>Browse</button>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.epub,.txt,.docx" className="visually-hidden" onChange={(event) => { if (event.target.files) handleFiles(event.target.files); event.target.value = ""; }} />
              </div>

              <div className="library-tools">
                <div className="search-field"><Search size={16} /><input id="library-search" placeholder="Search documents..." aria-label="Search documents" /></div>
                <button className="filter-button" onClick={() => toast("Filters are coming soon")}><span>All files</span><ChevronDown size={14} /></button>
              </div>

              <div className="document-list">
                {documents.map((document) => {
                  const ready = document.status === "Ready";
                  const failed = document.status === "Error";
                  return (
                    <button key={document.id} className={`document-row ${activeDocument === document.id ? "document-row-active" : ""}`} onClick={() => setActiveDocument(document.id)}>
                      <FileIcon type={document.icon} tone={document.tone} />
                      <span className="document-copy"><strong>{document.name}</strong>
                        <span>
                          {document.status === "Indexing"
                            ? "Preparing chunks…"
                            : failed
                              ? "Indexing failed"
                              : `${formatBytes(document.size)} · ${document.chunks || 0} chunks`}
                        </span>
                      </span>
                      <span className={`document-status ${ready ? "document-status-ready" : "document-status-indexing"}`}>
                        {ready ? <CheckCircle2 size={14} /> : failed ? <X size={14} /> : <Clock3 size={14} />}{ready ? "Ready" : failed ? "Failed" : "Indexing"}
                      </span>
                      <MoreHorizontal size={16} className="document-more" />
                    </button>
                  );
                })}
              </div>

              <div className="storage-meter">
                <div className="storage-label">
                  <span>Workspace storage</span>
                  <strong>{formatBytes(totalBytes)} / 50 MB</strong>
                </div>
                <div className="meter-track"><span style={{ width: `${Math.min(100, (totalBytes / (50 * 1024 * 1024)) * 100)}%` }} /></div>
              </div>
            </section>

            <section className="glass-panel chat-panel">
              <div className="panel-heading chat-heading">
                <div className="chat-title-wrap">
                  <div className="assistant-orb"><Sparkles size={17} /></div>
                  <div>
                    <div className="panel-kicker">Novar <span className="online-dot" /> ready to help</div>
                    <h2>Ask your library</h2>
                  </div>
                </div>
                <button className="small-icon-button" aria-label="Chat options" onClick={() => toast("Chat options are coming soon")}><MoreHorizontal size={18} /></button>
              </div>

              <div className="chat-body">
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <div className="empty-illustration"><div className="empty-ring ring-one" /><div className="empty-ring ring-two" /><Sparkles size={27} /></div>
                    <h3>{canChat ? "Start with a thoughtful question." : "Upload a document to begin"}</h3>
                    <p>
                      {canChat
                        ? "I’ll search across your indexed documents and bring back the useful parts, with sources."
                        : "Your vector archive is empty — drop a PDF, EPUB, TXT, or DOCX in the library."}
                    </p>
                    {canChat ? (
                      <div className="prompt-stack">
                        {starterPrompts.map((prompt) => <button key={prompt} className="prompt-chip" onClick={() => submitQuery(prompt)}><ArrowUpRight size={15} />{prompt}</button>)}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="message-list">
                    {messages.map((message) => (
                      <div key={message.id} className={`message ${message.role === "user" ? "message-user" : "message-assistant"}`}>
                        {message.role === "assistant" ? <div className="message-avatar"><Sparkles size={14} /></div> : null}
                        <div className="message-content">
                          <div className="message-label">{message.role === "user" ? "You" : message.role === "error" ? "Error" : "Novar"}</div>
                          <div className={`message-bubble ${message.role === "error" ? "message-error" : ""}`}>
                            {message.role === "assistant" ? formatAssistantText(message.content) : message.content}
                          </div>
                          {message.sources?.length ? <div className="source-row"><span>Sources</span>{message.sources.map((source) => <button key={source} className="source-chip" onClick={() => toast(`Source: ${source}`)}><FileText size={12} />{source}</button>)}</div> : null}
                          {message.role === "assistant" ? <div className="message-actions"><button onClick={() => handleCopy(message.content)}><Copy size={13} /> Copy</button><button onClick={() => toast("Thanks for the feedback")}><ThumbsUp size={13} /></button><button onClick={() => toast("Thanks for the feedback")}><ThumbsDown size={13} /></button></div> : null}
                        </div>
                      </div>
                    ))}
                    {thinking ? <div className="message message-assistant"><div className="message-avatar"><Sparkles size={14} /></div><div className="message-content"><div className="message-label">Novar</div><div className="message-bubble thinking-bubble"><span /><span /><span /></div></div></div> : null}
                  </div>
                )}
              </div>

              {error && (
                <div className="error-banner" role="alert">
                  <span>⚠ {error}</span>
                  <button style={{ marginLeft: "auto" }} className="composer-attach" aria-label="Dismiss" onClick={clearError}>✕</button>
                </div>
              )}

              <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); submitQuery(); }}>
                <button type="button" className="composer-attach" aria-label="Attach a file" onClick={pickFiles}><Paperclip size={17} /></button>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={chatPlaceholder} aria-label="Ask anything about your library" />
                <span className="composer-hint">Enter to send</span>
                <button className="send-button" type="submit" aria-label="Send message" disabled={!query.trim() || thinking || !canChat}><Send size={16} /></button>
              </form>
              <div className="chat-footer"><span><Zap size={13} /> Answers are grounded in your library</span><span>Sources included automatically</span></div>
            </section>
          </div>

          <section className="insight-strip">
            <div className="insight-icon"><Check size={15} /></div>
            <div>
              <strong>{readyFiles.length > 0 ? "Your workspace is ready." : "Start by adding documents."}</strong>
              <span>{readyFiles.length} document{readyFiles.length === 1 ? "" : "s"} indexed and available to chat with.</span>
            </div>
            <button onClick={() => toast(`${readyFiles.length} documents · ${totalChunks.toLocaleString()} chunks in vector memory`)}>View details <ArrowUpRight size={14} /></button>
          </section>
        </div>
      </main>
    </div>
  );
}