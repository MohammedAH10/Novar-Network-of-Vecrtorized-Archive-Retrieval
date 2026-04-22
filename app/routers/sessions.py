import logging

from app.models.schemas import SessionDeleteResponse
from app.utils.errors import SessionNotFoundError
from fastapi import APIRouter, HTTPException, status

from app.services.session_store import session_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.delete("/{session_id}", response_model=SessionDeleteResponse)
async def delete_session(session_id: str) -> SessionDeleteResponse:
    """
    Delete a session and free all associated in-memory vector data.
    """
    deleted = session_store.delete(session_id)
    if not deleted:
        exc = SessionNotFoundError(session_id)
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return SessionDeleteResponse(
        session_id=session_id,
        message="Session deleted and memory freed.",
    )


@router.get("/{session_id}/files")
async def list_session_files(session_id: str) -> dict:
    """
    List files indexed in a session.
    """
    session = session_store.get(session_id)
    if not session:
        exc = SessionNotFoundError(session_id)
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return {
        "session_id": session_id,
        "files": session.uploaded_files,
    }
