import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chat, sessions, upload
from app.utils.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

settings = get_settings()

app = FastAPI(
    title="NotebookLM Lite",
    description="Upload documents and chat with them using Gemini + LangChain.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(sessions.router)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}