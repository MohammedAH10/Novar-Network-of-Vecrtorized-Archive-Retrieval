from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash"
    huggingface_embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_batch_size: int = 64
    embedding_threads: int | None = None
    index_batch_size: int = 256

    # Chunking
    chunk_size: int = 1800
    chunk_overlap: int = 200

    # Retrieval
    retrieval_k: int = 5

    # CORS — set to your React dev server
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
