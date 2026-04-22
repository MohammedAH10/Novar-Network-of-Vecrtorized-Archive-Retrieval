import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_service import chat, chat_stream
from app.utils.config import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat_endpoint(
    body: ChatRequest,
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
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


@router.post("/stream")
async def chat_stream_endpoint(
    body: ChatRequest,
    settings: Settings = Depends(get_settings),
) -> StreamingResponse:
    from app.services.session_store import session_store

    if not session_store.exists(body.session_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{body.session_id}' not found.",
        )
    return StreamingResponse(
        chat_stream(
            session_id=body.session_id,
            user_message=body.message,
            settings=settings,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
