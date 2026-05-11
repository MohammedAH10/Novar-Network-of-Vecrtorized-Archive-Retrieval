import json
import logging
import os
import uuid

os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

import chromadb
from chromadb.config import Settings as ChromaClientSettings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI

from app.models.schemas import ChatResponse, UploadResponse
from app.services.session_store import SessionData, session_store
from app.utils.config import Settings
from app.utils.errors import (
    DocumentValidationError,
    EmbeddingError,
    ResponseGenerationError,
    RetrievalError,
    SessionNotFoundError,
)
from app.utils.parser import parse_document

logger = logging.getLogger(__name__)


CONDENSE_QUESTION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Given the conversation history and a new user question, rewrite the "
            "question to be a standalone question that captures all necessary context. "
            "If the question is already standalone, return it unchanged. "
            "Return ONLY the rewritten question, nothing else.",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ]
)

ANSWER_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a helpful assistant that answers questions strictly based on the "
            "provided document context. Be concise and precise. "
            "If the context does not contain enough information to answer the question, "
            "say so clearly — do not make up information.\n\n"
            "Context:\n{context}",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ]
)


def _build_embeddings(settings: Settings) -> Embeddings:
    return FastEmbedEmbeddings(
        model_name=settings.huggingface_embedding_model,
        batch_size=settings.embedding_batch_size,
        threads=settings.embedding_threads,
    )


def _build_llm(settings: Settings) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.2,
    )


def _format_docs(docs: list[Document]) -> str:
    return "\n\n---\n\n".join(doc.page_content for doc in docs)


def _extract_source_names(docs: list[Document]) -> list[str]:
    seen: set[str] = set()
    sources: list[str] = []
    for doc in docs:
        src = doc.metadata.get("source", "unknown")
        if src not in seen:
            seen.add(src)
            sources.append(src)
    return sources


def _sse(event: str, data: str) -> str:
    return f"event: {event}\ndata: {data}\n\n"


def _add_documents_in_batches(
    vectorstore: Chroma,
    documents: list[Document],
    batch_size: int,
) -> None:
    safe_batch_size = max(1, batch_size)
    for start in range(0, len(documents), safe_batch_size):
        vectorstore.add_documents(documents[start : start + safe_batch_size])


# ------------------------------------------------------------------ #
# Ingestion
# ------------------------------------------------------------------ #


async def ingest_document(
    filename: str,
    content: bytes,
    settings: Settings,
    session_id: str | None = None,
) -> UploadResponse:
    raw_docs = parse_document(filename, content)
    if not raw_docs:
        raise DocumentValidationError(
            f"No extractable text found in '{filename}'."
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(raw_docs)
    logger.info("Split '%s' into %d chunks", filename, len(chunks))

    try:
        embeddings = _build_embeddings(settings)
    except Exception:
        logger.exception(
            "Failed to load embedding model '%s'",
            settings.huggingface_embedding_model,
        )
        raise EmbeddingError()

    if session_id and session_store.exists(session_id):
        session = session_store.get(session_id)
        try:
            _add_documents_in_batches(
                session.vectorstore,
                chunks,
                settings.index_batch_size,
            )
        except Exception:
            logger.exception(
                "Embedding/indexing failed while appending '%s' to session %s",
                filename,
                session_id,
            )
            raise EmbeddingError()
        session.uploaded_files.append(filename)
        logger.info(
            "Appended %d chunks to existing session %s", len(chunks), session_id
        )
    else:
        session_id = session_id or str(uuid.uuid4())
        collection_name = f"session_{session_id.replace('-', '_')}"

        chroma_client = chromadb.EphemeralClient(
            settings=ChromaClientSettings(anonymized_telemetry=False)
        )
        vectorstore = Chroma(
            client=chroma_client,
            collection_name=collection_name,
            embedding_function=embeddings,
        )
        try:
            _add_documents_in_batches(
                vectorstore,
                chunks,
                settings.index_batch_size,
            )
        except Exception:
            logger.exception(
                "Embedding/indexing failed while creating session for '%s'",
                filename,
            )
            raise EmbeddingError()

        session_store.set(
            session_id,
            SessionData(
                session_id=session_id,
                vectorstore=vectorstore,
                uploaded_files=[filename],
            ),
        )
        logger.info("Created new session %s with %d chunks", session_id, len(chunks))

    return UploadResponse(
        session_id=session_id,
        filename=filename,
        chunks_indexed=len(chunks),
        message=f"Successfully indexed '{filename}' into session.",
    )


# ------------------------------------------------------------------ #
# Chat (non-streaming)
# ------------------------------------------------------------------ #


async def chat(
    session_id: str,
    user_message: str,
    settings: Settings,
) -> ChatResponse:
    session = session_store.get(session_id)
    if not session:
        raise SessionNotFoundError(session_id)

    llm = _build_llm(settings)
    retriever = session.vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": settings.retrieval_k},
    )

    if session.chat_history:
        condense_chain = CONDENSE_QUESTION_PROMPT | llm | StrOutputParser()
        standalone_question = await condense_chain.ainvoke(
            {"chat_history": session.chat_history, "question": user_message}
        )
    else:
        standalone_question = user_message

    try:
        relevant_docs = await retriever.ainvoke(standalone_question)
    except Exception:
        logger.exception("Retrieval failed for session '%s'", session_id)
        raise RetrievalError()
    context = _format_docs(relevant_docs)
    sources = _extract_source_names(relevant_docs)

    answer_chain = ANSWER_PROMPT | llm | StrOutputParser()
    try:
        answer = await answer_chain.ainvoke(
            {
                "context": context,
                "chat_history": session.chat_history,
                "question": user_message,
            }
        )
    except Exception:
        logger.exception("Response generation failed for session '%s'", session_id)
        raise ResponseGenerationError()

    session.chat_history.extend(
        [HumanMessage(content=user_message), AIMessage(content=answer)]
    )

    return ChatResponse(answer=answer, session_id=session_id, sources=sources)


# ------------------------------------------------------------------ #
# Chat (streaming)
# ------------------------------------------------------------------ #


async def chat_stream(
    session_id: str,
    user_message: str,
    settings: Settings,
):
    session = session_store.get(session_id)
    if not session:
        yield _sse("error", SessionNotFoundError(session_id).message)
        return

    try:
        llm = _build_llm(settings)
        retriever = session.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": settings.retrieval_k},
        )

        if session.chat_history:
            condense_chain = CONDENSE_QUESTION_PROMPT | llm | StrOutputParser()
            standalone_question = await condense_chain.ainvoke(
                {"chat_history": session.chat_history, "question": user_message}
            )
        else:
            standalone_question = user_message

        try:
            relevant_docs = await retriever.ainvoke(standalone_question)
        except Exception:
            logger.exception("Retrieval failed for session '%s'", session_id)
            raise RetrievalError()
        context = _format_docs(relevant_docs)
        sources = _extract_source_names(relevant_docs)

        yield _sse("sources", json.dumps(sources))

        answer_chain = ANSWER_PROMPT | llm | StrOutputParser()
        full_answer = ""

        try:
            async for chunk in answer_chain.astream(
                {
                    "context": context,
                    "chat_history": session.chat_history,
                    "question": user_message,
                }
            ):
                if chunk:
                    full_answer += chunk
                    yield _sse("delta", chunk.replace("\n", "\\n"))
        except Exception:
            logger.exception("Response generation failed for session '%s'", session_id)
            raise ResponseGenerationError()

        session.chat_history.extend(
            [HumanMessage(content=user_message), AIMessage(content=full_answer)]
        )

        yield _sse("done", "{}")

    except (SessionNotFoundError, RetrievalError, ResponseGenerationError) as exc:
        yield _sse("error", exc.message)
    except Exception:
        logger.exception("Streaming chat failed for session '%s'", session_id)
        yield _sse("error", "Something went wrong while processing your request.")
