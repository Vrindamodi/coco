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

Using what you know:
- Everything under "Patient context" is real information the patient's family
  recorded in this app. You DO know it. Answer from it directly and confidently.
- When they ask about their home, their family, a person, a place, or something
  from their past, look it up in the My World journal and tell them the answer
  first, in one warm sentence. Only after that may you invite them to share more.
- Never say you do not know something that is written above, and never ask the
  patient to supply a fact you already have.
- Never invent details. Do not add a name, a family relationship, a place or a
  date that is not written above, and do not turn a single recorded date into a
  span of years. If something truly is not in the context, say gently that you
  do not have it written down and offer to ask their family, naming the
  caregiver if one is listed.
- Repeat facts calmly and without surprise if they ask the same thing again.

Language:
{language_rules}

Rules:
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


def _script_of(char: str) -> Optional[str]:
    cp = ord(char)
    if 0x0900 <= cp <= 0x097F or 0xA8E0 <= cp <= 0xA8FF:
        return "devanagari"
    if 0x0980 <= cp <= 0x09FF:
        return "bengali"
    if char.isascii() and char.isalpha():
        return "latin"
    return None


def detect_text_language(text: str, app_language: str) -> Optional[str]:
    """Which supported language did the patient type in?

    Script is the only signal available for typed text, so this cannot tell
    Assamese from Bengali (one script) or English from romanised Hindi (one
    alphabet). The app language breaks the first tie; the model is told to
    override the second when the words say otherwise.
    """
    counts = {"devanagari": 0, "bengali": 0, "latin": 0}
    for char in text:
        script = _script_of(char)
        if script:
            counts[script] += 1

    total = sum(counts.values())
    if total == 0:
        return None

    indic_script = max(("devanagari", "bengali"), key=lambda s: counts[s])
    indic = counts[indic_script]
    # Indic wins on a minority share, matching the narrator's script splitter:
    # a few English words inside a Hindi sentence do not make the message
    # English, but the reverse is not true.
    if indic and indic / total >= 0.3:
        if indic_script == "devanagari":
            return "hi"
        return "as" if app_language == "as" else "bn"
    if counts["latin"]:
        return "en"
    return None


def _language_rules(reply_language: str, app_language: str, detected: bool) -> str:
    """Tell the model which language to answer in, and how sure we are."""
    reply_name = LANGUAGE_NAMES[reply_language]

    if not detected:
        # Punctuation, digits or an emoji: nothing to mirror, so fall back to
        # the interface language rather than assert something untrue.
        return (
            f"- The patient's last message gives no clue which language it is "
            f"in. Reply in {reply_name} ({reply_language}), unless the message "
            f"is plainly in another language — then use theirs."
        )

    lines = [
        f"- The patient's last message is in {reply_name}. Reply ONLY in "
        f"{reply_name} ({reply_language}), written in its own script.",
        "- Always answer in the language the patient used, even when the app's "
        f"interface language is something else (it is currently "
        f"{LANGUAGE_NAMES[app_language]}). Follow the patient, not the app.",
        "- If they switch language later, switch with them on the very next reply.",
    ]

    if reply_language == "en":
        # Script alone cannot separate English from romanised Hindi/Assamese,
        # which is how many patients type on a phone keyboard.
        lines.append(
            "- If their message is actually Hindi, Assamese or Bengali written "
            "in English letters, reply in that language in its own script "
            "instead of in English."
        )

    return "\n".join(lines)


def _build_system_prompt(
    patient: Patient,
    patient_context: str,
    reply_language: str,
    app_language: str,
    detected: bool,
) -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(
        patient_context=patient_context,
        language_rules=_language_rules(reply_language, app_language, detected),
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
    app_language = _resolve_language(patient, language_override)
    user_language: Optional[str] = None

    if text and text.strip():
        user_text = text.strip()
        user_language = detect_text_language(user_text, app_language)
    elif audio_bytes:
        transcription = groq_client.transcribe_audio(
            audio_bytes,
            audio_filename,
            language_hint=app_language,
        )
        user_text = transcription.text
        if transcription.language in LANGUAGE_NAMES:
            user_language = transcription.language
        # Whisper cannot tell Assamese from Bengali, so under an Assamese
        # setting a Bengali detection is the patient speaking Assamese.
        if app_language == "as" and user_language == "bn":
            user_language = "as"
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

    # Answer in the language the patient used. The narrator picks its voice
    # from the script of the reply, not from the interface setting, so a Hindi
    # answer inside an Assamese app is still spoken aloud correctly.
    reply_language = user_language or app_language

    patient_context = build_patient_context(db, patient, language=app_language)
    system_prompt = _build_system_prompt(
        patient,
        patient_context,
        reply_language,
        app_language,
        detected=user_language is not None,
    )
    history = _load_history(db, patient.id)
    groq_messages = _to_groq_messages(system_prompt, history, user_text)
    assistant_text = groq_client.chat_completion(groq_messages)

    user_message = _persist_message(
        db, patient.id, ChatRole.USER, user_text, user_language or app_language
    )
    # Label the reply by what was actually written. Romanised Hindi reads as
    # Latin on the way in, and the model answers it in Devanagari, so the
    # requested language is not always the one that came back.
    assistant_language = detect_text_language(assistant_text, app_language) or reply_language
    assistant_message = _persist_message(
        db, patient.id, ChatRole.ASSISTANT, assistant_text, assistant_language
    )

    return {
        "transcript": user_text,
        "user_message": user_message,
        "assistant_message": assistant_message,
    }
