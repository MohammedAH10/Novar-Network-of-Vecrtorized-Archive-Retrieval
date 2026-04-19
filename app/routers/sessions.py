import logging

from app.models.schemas import SessionDeleteResponse
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    return {
        "session_id": session_id,
        "files": session.uploaded_files,
    }
