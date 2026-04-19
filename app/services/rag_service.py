import logging
import uuid

import chromadb
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from app.models.schemas import ChatResponse, UploadResponse
from app.services.session_store import SessionData, session_store
from app.utils.config import Settings
from app.utils.parser import parse_document

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------ #
# Prompts
# ------------------------------------------------------------------ #

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


# ------------------------------------------------------------------ #
# Helpers
# ------------------------------------------------------------------ #

def _build_embeddings(settings: Settings) -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model=settings.gemini_embedding_model,
        google_api_key=settings.gemini_api_key,
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


# ------------------------------------------------------------------ #
# Ingestion
# ------------------------------------------------------------------ #

async def ingest_document(
    filename: str,
    content: bytes,
    settings: Settings,
    session_id: str | None = None,
) -> UploadResponse:
    """
    Parse → chunk → embed → store in an in-memory ChromaDB collection.
    If session_id is provided, documents are appended to the existing session.
    Otherwise a new session is created.
    """
    # Parse raw bytes into LangChain Documents
    raw_docs = parse_document(filename, content)
    if not raw_docs:
        raise ValueError(f"No extractable text found in '{filename}'.")

    # Chunk
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(raw_docs)
    logger.info("Split '%s' into %d chunks", filename, len(chunks))

    embeddings = _build_embeddings(settings)

    # Reuse or create session
    if session_id and session_store.exists(session_id):
        session = session_store.get(session_id)
        session.vectorstore.add_documents(chunks)
        session.uploaded_files.append(filename)
        logger.info("Appended %d chunks to existing session %s", len(chunks), session_id)
    else:
        # Each session gets its own ephemeral ChromaDB collection
        session_id = session_id or str(uuid.uuid4())
        collection_name = f"session_{session_id.replace('-', '_')}"

        chroma_client = chromadb.EphemeralClient()
        vectorstore = Chroma(
            client=chroma_client,
            collection_name=collection_name,
            embedding_function=embeddings,
        )
        vectorstore.add_documents(chunks)

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
# Chat
# ------------------------------------------------------------------ #

async def chat(
    session_id: str,
    user_message: str,
    settings: Settings,
) -> ChatResponse:
    """
    Retrieve relevant chunks, run conversational RAG chain, update history.
    """
    session = session_store.get(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found.")

    llm = _build_llm(settings)
    retriever = session.vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": settings.retrieval_k},
    )

    # Step 1: condense the question if there is chat history
    if session.chat_history:
        condense_chain = CONDENSE_QUESTION_PROMPT | llm | StrOutputParser()
        standalone_question = await condense_chain.ainvoke(
            {
                "chat_history": session.chat_history,
                "question": user_message,
            }
        )
    else:
        standalone_question = user_message

    # Step 2: retrieve relevant docs
    relevant_docs = await retriever.ainvoke(standalone_question)
    context = _format_docs(relevant_docs)
    sources = _extract_source_names(relevant_docs)

    # Step 3: generate answer
    answer_chain = ANSWER_PROMPT | llm | StrOutputParser()
    answer = await answer_chain.ainvoke(
        {
            "context": context,
            "chat_history": session.chat_history,
            "question": user_message,
        }
    )

    # Step 4: update history
    session.chat_history.extend(
        [
            HumanMessage(content=user_message),
            AIMessage(content=answer),
        ]
    )

    return ChatResponse(
        answer=answer,
        session_id=session_id,
        sources=sources,
    )