# NotebookLM Lite — Backend

A minimal document Q&A backend powered by FastAPI, LangChain, ChromaDB (in-memory), and the Gemini API.

## Stack

- **FastAPI** — async HTTP server
- **LangChain** — RAG chain orchestration
- **langchain-google-genai** — Gemini LLM + embeddings
- **ChromaDB (EphemeralClient)** — in-memory vector store, one collection per session
- **pypdf / python-docx / ebooklib** — document parsing

## Project Structure

```
notebooklm/
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
├── .env.example
├── requirements.txt
└── README.md
```

## Setup

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env and set your GEMINI_API_KEY
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Swagger UI available at: http://localhost:8000/docs

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
