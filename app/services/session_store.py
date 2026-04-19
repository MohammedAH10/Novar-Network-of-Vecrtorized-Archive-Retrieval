import logging
import uuid
from dataclasses import dataclass, field
from typing import Optional

from langchain_core.messages import BaseMessage

logger = logging.getLogger(__name__)


@dataclass
class SessionData:
    session_id: str
    vectorstore: object  # langchain_chroma.Chroma instance
    chat_history: list[BaseMessage] = field(default_factory=list)
    uploaded_files: list[str] = field(default_factory=list)


class SessionStore:
    """
    Simple in-memory store. Each session has its own ChromaDB collection
    (ephemeral, client-side only) and conversation history.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, SessionData] = {}

    def create_session(self) -> str:
        session_id = str(uuid.uuid4())
        # SessionData is created after the vectorstore is built — see service layer
        logger.info("Reserved session slot: %s", session_id)
        return session_id

    def set(self, session_id: str, data: SessionData) -> None:
        self._sessions[session_id] = data
        logger.info("Stored session: %s", session_id)

    def get(self, session_id: str) -> Optional[SessionData]:
        return self._sessions.get(session_id)

    def delete(self, session_id: str) -> bool:
        if session_id in self._sessions:
            data = self._sessions.pop(session_id)
            # Delete the underlying ChromaDB collection to free memory
            try:
                data.vectorstore.delete_collection()
            except Exception as exc:
                logger.warning(
                    "Could not delete collection for %s: %s", session_id, exc
                )
            logger.info("Deleted session: %s", session_id)
            return True
        return False

    def exists(self, session_id: str) -> bool:
        return session_id in self._sessions

    def all_session_ids(self) -> list[str]:
        return list(self._sessions.keys())


# Singleton — imported wherever needed
session_store = SessionStore()
