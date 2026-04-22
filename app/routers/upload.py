import logging
from typing import Annotated, Optional

from app.models.schemas import UploadResponse
from app.utils.config import Settings, get_settings
from app.utils.errors import UserFacingError
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.services.rag_service import ingest_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/epub+zip",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    # Some browsers send generic binary type for EPUB/DOCX
    "application/octet-stream",
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: Annotated[UploadFile, File(description="PDF, EPUB, TXT, or DOCX file")],
    session_id: Annotated[
        Optional[str],
        Form(
            description="Existing session ID to append documents to. Leave empty to create a new session."
        ),
    ] = None,
    settings: Settings = Depends(get_settings),
) -> UploadResponse:
    """
    Upload and index a document. Returns a session_id that must be passed to /chat.
    You can call this endpoint multiple times with the same session_id to build a
    multi-document session.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 50 MB limit.",
        )

    try:
        result = await ingest_document(
            filename=file.filename,
            content=content,
            settings=settings,
            session_id=session_id,
        )
    except UserFacingError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        )
    except Exception:
        logger.exception("Failed to ingest document '%s'", file.filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong while processing your document.",
        )

    return result
