# Novar: Network of Vectorized Archive Retrieval

A minimal document Q&A application with a FastAPI backend and React frontend, powered by LangChain, ChromaDB (in-memory), and the Gemini API.

## Stack

- **FastAPI** — async backend server
- **React + Vite** — frontend UI
- **LangChain** — RAG chain orchestration
- **langchain-google-genai** — Gemini LLM + embeddings
- **ChromaDB (EphemeralClient)** — in-memory vector store, one collection per session
- **pypdf / python-docx / ebooklib** — document parsing

## Project Structure

```
novar/
├── Novar-UI/
│   ├── src/
│   │   ├── components/         # Upload, chat, file list, and streaming UI pieces
│   │   ├── hooks/              # Frontend session state management
│   │   └── lib/                # API helpers for backend calls
│   ├── package.json
│   └── vite.config.js          # Dev server + proxy to FastAPI
├── app/
│   ├── main.py                 # FastAPI app, CORS, router registration
│   ├── models/
│   │   └── schemas.py          # Pydantic request/response models
│   ├── routers/
│   │   ├── upload.py           # POST /upload
│   │   ├── chat.py             # POST /chat
│   │   └── sessions.py         # DELETE /sessions/{id}, GET /sessions/{id}/files
│   ├── services/
│   │   ├── rag_service.py      # Ingestion + conversational RAG chain
│   │   └── session_store.py    # In-memory session registry
│   └── utils/
│       ├── config.py           # Pydantic settings (reads .env)
│       └── parser.py           # PDF / EPUB / TXT / DOCX parsers
├── requirements.txt
├── .env
└── README.md
```

## Setup

### Backend

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Create .env and set your Gemini credentials
```

Example `.env`:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
HUGGINGFACE_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_BATCH_SIZE=64
INDEX_BATCH_SIZE=256
CHUNK_SIZE=1800
CHUNK_OVERLAP=200
RETRIEVAL_K=5
```

### Frontend

```bash
cd Novar-UI
npm install
```

## Run

Start the backend from the project root:

```bash
uvicorn app.main:app --reload --port 8000
```

Start the frontend in a second terminal:

```bash
cd Novar-UI
npm run dev
```

Frontend UI: http://localhost:5173

Swagger UI: http://localhost:8000/docs

The Vite dev server proxies `/upload`, `/chat`, `/sessions`, and `/health` to the FastAPI backend on `localhost:8000`.

## API Reference

### POST /upload

Upload and index a document. Accepts `multipart/form-data`.

| Field        | Type   | Required | Description                                          |
|--------------|--------|----------|------------------------------------------------------|
| `file`       | file   | yes      | PDF, EPUB, TXT, or DOCX                              |
| `session_id` | string | no       | Pass an existing session ID to add to it             |

Response:
```json
{
  "session_id": "uuid",
  "filename": "paper.pdf",
  "chunks_indexed": 42,
  "message": "Successfully indexed 'paper.pdf' into session."
}
```

### POST /chat

```json
{
  "session_id": "uuid",
  "message": "What is the main argument of chapter 2?"
}
```

Response:
```json
{
  "answer": "...",
  "session_id": "uuid",
  "sources": ["paper.pdf"]
}
```

### POST /chat/stream

Streaming version of chat used by the frontend. Returns `text/event-stream` with these event types:

- `sources` — emitted once with the retrieved source filenames
- `delta` — incremental answer chunks
- `done` — emitted when the response is complete
- `error` — emitted if streaming fails

### DELETE /sessions/{session_id}

Clears the session and frees all in-memory vector data.

### GET /sessions/{session_id}/files

Returns the list of filenames indexed in the session.

## Notes

- All vector data lives in RAM — nothing is persisted to disk.
- Sessions are lost on server restart.
- To support multiple documents in one conversation, call `/upload` multiple times
  with the same `session_id`.
- Max file size: 50 MB per upload.
- Supported upload formats: PDF, EPUB, TXT, DOCX.
- If you restart the backend, you must upload documents again because sessions and vectors are in-memory only.
