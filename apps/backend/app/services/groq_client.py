from __future__ import annotations

import io
import logging
from typing import Optional

from fastapi import HTTPException, status
from groq import APIError, Groq

from app.config import settings

logger = logging.getLogger(__name__)

_client: Optional[Groq] = None

WHISPER_LANGUAGE_HINTS: dict[str, str] = {
    "en": "en",
    "hi": "hi",
    "bn": "bn",
    "as": "hi",
}


def _get_client() -> Groq:
    global _client
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice chat is not configured. Please set GROQ_API_KEY.",
        )
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def _raise_groq_error(exc: APIError, *, operation: str) -> None:
    logger.warning("Groq %s failed: %s", operation, exc)
    status_code = exc.status_code if exc.status_code else status.HTTP_502_BAD_GATEWAY
    if status_code == 404:
        detail = (
            f"Configured Groq model is unavailable ({settings.GROQ_CHAT_MODEL}). "
            "Set GROQ_CHAT_MODEL to a model your API key can access."
        )
    else:
        detail = f"AI {operation} failed. Please try again."
    raise HTTPException(status_code=status_code, detail=detail) from exc


def transcribe_audio(
    file_bytes: bytes,
    filename: str,
    language_hint: Optional[str] = None,
) -> str:
    client = _get_client()
    whisper_lang = WHISPER_LANGUAGE_HINTS.get(language_hint or "", None)

    kwargs: dict = {
        "file": (filename, io.BytesIO(file_bytes)),
        "model": settings.GROQ_WHISPER_MODEL,
        "response_format": "text",
    }
    if whisper_lang:
        kwargs["language"] = whisper_lang

    try:
        transcription = client.audio.transcriptions.create(**kwargs)
    except APIError as exc:
        _raise_groq_error(exc, operation="speech recognition")

    text = transcription if isinstance(transcription, str) else str(transcription)
    return text.strip()


def chat_completion(messages: list[dict[str, str]]) -> str:
    client = _get_client()
    try:
        response = client.chat.completions.create(
            model=settings.GROQ_CHAT_MODEL,
            messages=messages,
            temperature=0.6,
            max_tokens=300,
        )
    except APIError as exc:
        _raise_groq_error(exc, operation="chat")

    content = response.choices[0].message.content
    if not content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Empty response from AI assistant.",
        )
    return content.strip()
