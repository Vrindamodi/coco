from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass
from typing import Any, Optional

import httpx
from fastapi import HTTPException, status
from groq import APIError, Groq

from app.config import settings

logger = logging.getLogger(__name__)

_client: Optional[Groq] = None

# ISO-639-1 hints for the forced-language fallback pass.
#
# Whisper's Assamese model is unusable: on Assamese speech it emits control
# characters, and on any other Indic speech it emits Devanagari. Bengali
# shares the script and most of the phonology, so it is the hint that
# produces text an Assamese speaker can read. (The narrator side makes the
# same substitution for TTS voices.)
WHISPER_LANGUAGE_HINTS: dict[str, str] = {
    "en": "en",
    "hi": "hi",
    "bn": "bn",
    "as": "bn",
}

# verbose_json reports the language by name, not by code.
WHISPER_LANGUAGE_CODES: dict[str, str] = {
    "english": "en",
    "hindi": "hi",
    "bengali": "bn",
    "assamese": "as",
    "en": "en",
    "hi": "hi",
    "bn": "bn",
    "as": "as",
}

# Mean segment log-probability below this means Whisper was guessing.
LOW_CONFIDENCE_LOGPROB = -1.0
# Above this the auto pass is worth a second opinion from the forced pass:
# Whisper's language guess on Assamese speech is often "English" at exactly
# this kind of middling score.
DOUBTFUL_LOGPROB = -0.5
# Mean segment no-speech probability above this suggests the clip was silence.
# Only a suggestion: a patient who taps and then pauses before speaking scores
# 0.7-0.8 here with perfectly good words behind the pause, so it counts as
# silence only when the decoder was also guessing (Whisper's own rule).
NO_SPEECH_THRESHOLD = 0.6

# Whisper's stock output on silence. Matched case-insensitively against the
# whole transcript once punctuation is stripped.
HALLUCINATION_PHRASES: frozenset[str] = frozenset(
    {
        "thank you",
        "thanks",
        "thank you for watching",
        "thanks for watching",
        "please subscribe",
        "subscribe",
        "you",
        "bye",
        "धन्यवाद",
        "शुक्रिया",
        "ধন্যবাদ",
    }
)

_PUNCT_RE = re.compile(r"[\s\.\,\!\?\।\'\"\-]+")


@dataclass
class Transcription:
    text: str
    # App language code (en/hi/bn/as) Whisper detected, or None if it named
    # a language the app does not support.
    language: Optional[str]
    confidence: Optional[float]
    no_speech_prob: Optional[float]

    @property
    def is_empty(self) -> bool:
        return not self.text

    @property
    def is_low_confidence(self) -> bool:
        return self.confidence is not None and self.confidence < LOW_CONFIDENCE_LOGPROB

    @property
    def is_probably_silent(self) -> bool:
        return self.no_speech_prob is not None and self.no_speech_prob > NO_SPEECH_THRESHOLD

    @property
    def is_silence(self) -> bool:
        return self.is_probably_silent and (self.confidence is None or self.is_low_confidence)

    @property
    def is_doubtful(self) -> bool:
        """Usable, but shaky enough that the forced pass may do better."""
        return self.is_probably_silent or (
            self.confidence is not None and self.confidence < DOUBTFUL_LOGPROB
        )

    @property
    def is_usable(self) -> bool:
        return not (self.is_empty or self.is_silence or _is_hallucination(self.text))

    @property
    def rejection_reason(self) -> Optional[str]:
        if self.is_empty:
            return "empty"
        if self.is_silence:
            return "silence"
        if _is_hallucination(self.text):
            return "hallucination"
        return None


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


# --- Local provider (whisper.cpp server + Ollama on the host machine) -------

LOCAL_TIMEOUT_S = 180.0


def _raise_local_error(exc: Exception, *, operation: str, url: str) -> None:
    logger.warning("Local %s failed at %s: %s", operation, url, exc)
    if isinstance(exc, httpx.HTTPStatusError):
        detail = f"Local AI {operation} failed ({exc.response.status_code}). Please try again."
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            f"Local AI {operation} server is not reachable at {url}. "
            "Start it with scripts/offline-ai.sh or set AI_PROVIDER=groq."
        ),
    ) from exc


def _local_transcribe(file_bytes: bytes, filename: str, language: Optional[str]) -> Any:
    url = f"{settings.LOCAL_STT_URL.rstrip('/')}/inference"
    data = {
        "response_format": "verbose_json",
        "temperature": "0",
        # whisper.cpp runs language detection only when told to.
        "language": language or "auto",
    }
    files = {"file": (filename, file_bytes, "application/octet-stream")}
    try:
        response = httpx.post(url, data=data, files=files, timeout=LOCAL_TIMEOUT_S)
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        _raise_local_error(exc, operation="speech recognition", url=url)


def _local_chat(messages: list[dict[str, str]]) -> str:
    url = f"{settings.LOCAL_LLM_URL.rstrip('/')}/v1/chat/completions"
    payload = {
        "model": settings.LOCAL_LLM_MODEL,
        "messages": messages,
        "temperature": 0.6,
        "max_tokens": 300,
    }
    try:
        response = httpx.post(url, json=payload, timeout=LOCAL_TIMEOUT_S)
        response.raise_for_status()
        body = response.json()
        return (body["choices"][0]["message"]["content"] or "").strip()
    except (httpx.HTTPError, ValueError, KeyError, IndexError) as exc:
        _raise_local_error(exc, operation="chat", url=url)


def _field(obj: Any, name: str, default: Any = None) -> Any:
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def _mean(values: list[float]) -> Optional[float]:
    return sum(values) / len(values) if values else None


def _is_hallucination(text: str) -> bool:
    normalized = _PUNCT_RE.sub(" ", text).strip().lower()
    return normalized in HALLUCINATION_PHRASES


def _parse_verbose(response: Any) -> Transcription:
    text = (_field(response, "text", "") or "").strip()
    raw_language = _field(response, "language")
    segments = _field(response, "segments") or []
    logprobs = [
        float(v)
        for v in (_field(seg, "avg_logprob") for seg in segments)
        if v is not None
    ]
    no_speech = [
        float(v)
        for v in (_field(seg, "no_speech_prob") for seg in segments)
        if v is not None
    ]
    return Transcription(
        text=text,
        language=WHISPER_LANGUAGE_CODES.get(str(raw_language).lower()) if raw_language else None,
        confidence=_mean(logprobs),
        no_speech_prob=_mean(no_speech),
    )


def _transcribe_once(
    client: Optional[Groq],
    file_bytes: bytes,
    filename: str,
    *,
    language: Optional[str],
) -> Transcription:
    if client is None:
        return _parse_verbose(_local_transcribe(file_bytes, filename, language))

    kwargs: dict = {
        "file": (filename, io.BytesIO(file_bytes)),
        "model": settings.GROQ_WHISPER_MODEL,
        "response_format": "verbose_json",
        "temperature": 0,
    }
    if language:
        kwargs["language"] = language

    try:
        response = client.audio.transcriptions.create(**kwargs)
    except APIError as exc:
        _raise_groq_error(exc, operation="speech recognition")

    return _parse_verbose(response)


def transcribe_audio(
    file_bytes: bytes,
    filename: str,
    language_hint: Optional[str] = None,
) -> Transcription:
    """Transcribe speech from patients who switch between languages.

    Pass 1 lets Whisper detect the language itself, which keeps Hindi spoken
    under an Assamese setting in Devanagari and mixed sentences intact. A
    forced hint would instead transliterate everything into the hinted script
    while still reporting high confidence.

    Pass 2 forces the app language and only runs when pass 1 found nothing
    usable, was unsure, or named a language the app does not speak (short
    Bengali clips have come back as "Turkish"). Returns an empty transcript
    when neither pass found speech.
    """
    # None selects the local whisper.cpp server; the passes below are the same.
    client = None if settings.ai_is_local else _get_client()
    hint = WHISPER_LANGUAGE_HINTS.get(language_hint or "")

    auto = _transcribe_once(client, file_bytes, filename, language=None)
    logger.info(
        "Whisper auto pass: detected=%s confidence=%s no_speech=%s",
        auto.language, auto.confidence, auto.no_speech_prob,
    )

    needs_fallback = not auto.is_usable or auto.is_doubtful or auto.language is None
    if hint and needs_fallback:
        forced = _transcribe_once(client, file_bytes, filename, language=hint)
        logger.info(
            "Whisper forced pass: hint=%s confidence=%s no_speech=%s",
            hint, forced.confidence, forced.no_speech_prob,
        )
        if forced.is_usable and (
            not auto.is_usable
            or auto.language is None
            or (forced.confidence or 0.0) > (auto.confidence or 0.0)
        ):
            logger.info("Whisper: using forced pass")
            # The hint fixes the script, not the language: report the app
            # language the caller asked for rather than Whisper's echo of it.
            return Transcription(
                text=forced.text,
                language=language_hint if language_hint in WHISPER_LANGUAGE_HINTS else forced.language,
                confidence=forced.confidence,
                no_speech_prob=forced.no_speech_prob,
            )

    if not auto.is_usable:
        logger.info("Whisper: no usable transcript (%s)", auto.rejection_reason)
        return Transcription(
            text="",
            language=auto.language,
            confidence=auto.confidence,
            no_speech_prob=auto.no_speech_prob,
        )
    return auto


def chat_completion(messages: list[dict[str, str]]) -> str:
    if settings.ai_is_local:
        content = _local_chat(messages)
    else:
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
