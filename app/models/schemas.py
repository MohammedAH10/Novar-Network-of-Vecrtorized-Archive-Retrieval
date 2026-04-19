from typing import Optional

from pydantic import BaseModel


class UploadResponse(BaseModel):
    session_id: str
    filename: str
    chunks_indexed: int
    message: str


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    sources: list[str]


class SessionDeleteResponse(BaseModel):
    session_id: str
    message: str


class ErrorResponse(BaseModel):
    detail: str
