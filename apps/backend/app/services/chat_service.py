from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import ChatMessage, Patient
from app.models.enums import ChatRole
from app.services.chat_context import LANGUAGE_NAMES, build_patient_context
from app.services import groq_client

HISTORY_LIMIT = 10

SYSTEM_PROMPT_TEMPLATE = """You are Coco, a warm and patient cognitive companion for elderly people in North East India, especially those with memory challenges.

Your role:
- Offer gentle encouragement, memory support, and friendly conversation.
- Help with daily routines, reminders, games, hydration, and staying calm.
- Use short, simple sentences. Speak slowly and clearly in your mind.
- Never diagnose, prescribe medicine, or give medical advice.
- If someone seems distressed, respond calmly and suggest talking to a family member or doctor.
- When helpful, suggest playing a cognitive game in the app or checking today's reminders.

Patient context:
{patient_context}

Rules:
- Respond ONLY in {language_name} ({language_code}).
- Keep replies to 2-4 short sentences unless the user asks for more detail.
- Use culturally familiar references for the North Eastern Region when appropriate.
- Address the patient by their first name when natural.
- Do not mention that you are an AI unless asked directly.
"""


def _resolve_language(patient: Patient, override: Optional[str]) -> str:
    lang = (override or patient.preferred_language or "en").strip().lower()
    if lang not in LANGUAGE_NAMES:
        lang = "en"
    return lang


def _build_system_prompt(patient: Patient, patient_context: str, language: str) -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(
        patient_context=patient_context,
        language_name=LANGUAGE_NAMES[language],
        language_code=language,
    )


def _load_history(db: Session, patient_id: UUID, limit: int = HISTORY_LIMIT) -> list[ChatMessage]:
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.patient_id == patient_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(rows))


def _to_groq_messages(
    system_prompt: str,
    history: list[ChatMessage],
    user_text: str,
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for row in history:
        role_value = row.role.value if hasattr(row.role, "value") else str(row.role)
        role = "user" if role_value == ChatRole.USER.value else "assistant"
        messages.append({"role": role, "content": row.content})
    messages.append({"role": "user", "content": user_text})
    return messages


def _persist_message(
    db: Session,
    patient_id: UUID,
    role: ChatRole,
    content: str,
    language: str,
) -> ChatMessage:
    message = ChatMessage(
        patient_id=patient_id,
        role=role,
        content=content,
        language=language,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def list_chat_history(
    db: Session,
    patient: Patient,
    limit: int = 20,
) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.patient_id == patient.id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )


def process_chat_message(
    db: Session,
    patient: Patient,
    *,
    text: Optional[str] = None,
    audio_bytes: Optional[bytes] = None,
    audio_filename: str = "recording.m4a",
    language_override: Optional[str] = None,
) -> dict:
    language = _resolve_language(patient, language_override)

    if text and text.strip():
        user_text = text.strip()
    elif audio_bytes:
        user_text = groq_client.transcribe_audio(
            audio_bytes,
            audio_filename,
            language_hint=language,
        )
        if not user_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not understand the audio. Please try again.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either text or an audio recording.",
        )

    patient_context = build_patient_context(db, patient)
    system_prompt = _build_system_prompt(patient, patient_context, language)
    history = _load_history(db, patient.id)
    groq_messages = _to_groq_messages(system_prompt, history, user_text)
    assistant_text = groq_client.chat_completion(groq_messages)

    user_message = _persist_message(
        db, patient.id, ChatRole.USER, user_text, language
    )
    assistant_message = _persist_message(
        db, patient.id, ChatRole.ASSISTANT, assistant_text, language
    )

    return {
        "transcript": user_text,
        "user_message": user_message,
        "assistant_message": assistant_message,
    }
