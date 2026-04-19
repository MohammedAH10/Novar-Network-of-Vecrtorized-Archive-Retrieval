import logging

from app.models.schemas import ChatRequest, ChatResponse
from app.utils.config import Settings, get_settings
from fastapi import APIRouter, Depends, HTTPException, status

from app.services.rag_service import chat

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat_endpoint(
    body: ChatRequest,
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
    """
    Send a message and get an answer grounded in the uploaded documents.
    Maintains conversation history within the session.
    """
    try:
        result = await chat(
            session_id=body.session_id,
            user_message=body.message,
            settings=settings,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception("Chat failed for session '%s'", body.session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat error: {exc}",
        )

    return result
