from __future__ import annotations

from datetime import datetime, time, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Patient, Reminder

SUPPORTED_LANGUAGES = {"en": "en-IN", "as": "as-IN"}


def normalize_language(patient: Patient, requested: str | None) -> str:
    language = (requested or patient.preferred_language or "en").lower().split("-")[0]
    return language if language in SUPPORTED_LANGUAGES else "en"


def get_voice_config(patient: Patient) -> dict:
    language = normalize_language(patient, None)
    return {
        "patient_id": patient.id,
        "language": language,
        "locale": SUPPORTED_LANGUAGES[language],
        "supported_languages": list(SUPPORTED_LANGUAGES),
        "stt_mode": "client_transcript",
        "tts_mode": "client_tts",
    }


def _today_reminders(db: Session, patient_id: UUID) -> list[Reminder]:
    now = datetime.now(timezone.utc)
    start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    end = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)
    return (
        db.query(Reminder)
        .filter(
            Reminder.patient_id == patient_id,
            Reminder.scheduled_at >= start,
            Reminder.scheduled_at <= end,
        )
        .order_by(Reminder.scheduled_at)
        .all()
    )


def process_voice_command(db: Session, patient: Patient, text: str, language: str | None) -> dict:
    selected_language = normalize_language(patient, language)
    normalized = " ".join(text.strip().lower().split())
    reminders = _today_reminders(db, patient.id)
    pending = [r for r in reminders if not r.is_done]

    greeting_words = {"hello", "hi", "hey", "namaste", "নমস্কাৰ"}
    if normalized in greeting_words:
        response = (
            f"Hello {patient.full_name}. How can I help you today?"
            if selected_language == "en"
            else f"নমস্কাৰ {patient.full_name}। আজি মই আপোনাক কেনেকৈ সহায় কৰিব পাৰোঁ?"
        )
        return {"patient_id": patient.id, "language": selected_language, "transcript": text, "response_text": response, "action": "greeting", "reminder_ids": []}

    if "help" in normalized or "what can you do" in normalized or "কি কৰিব" in normalized:
        response = "I can tell you about your reminders, your next task, and help you navigate COCO." if selected_language == "en" else "মই আপোনাৰ ৰিমাইণ্ডাৰ, পৰৱৰ্তী কাম আৰু COCO নেভিগেট কৰাত সহায় কৰিব পাৰোঁ।"
        return {"patient_id": patient.id, "language": selected_language, "transcript": text, "response_text": response, "action": "help", "reminder_ids": []}

    asks_next = "next" in normalized and "reminder" in normalized
    asks_all = "reminder" in normalized or "reminders" in normalized or "ৰিমাইণ্ডাৰ" in normalized

    if asks_next:
        if pending:
            r = pending[0]
            response = f"Your next reminder is {r.title}." if selected_language == "en" else f"আপোনাৰ পৰৱৰ্তী ৰিমাইণ্ডাৰ হৈছে {r.title}।"
            return {"patient_id": patient.id, "language": selected_language, "transcript": text, "response_text": response, "action": "next_reminder", "reminder_ids": [str(r.id)]}
        response = "You have no pending reminders for today." if selected_language == "en" else "আজি আপোনাৰ কোনো বাকী থকা ৰিমাইণ্ডাৰ নাই।"
        return {"patient_id": patient.id, "language": selected_language, "transcript": text, "response_text": response, "action": "next_reminder", "reminder_ids": []}

    if asks_all:
        if not pending:
            response = "You have no pending reminders for today." if selected_language == "en" else "আজি আপোনাৰ কোনো বাকী থকা ৰিমাইণ্ডাৰ নাই।"
            ids = []
        else:
            titles = ", ".join(r.title for r in pending)
            response = f"Today's pending reminders are: {titles}." if selected_language == "en" else f"আজি বাকী থকা ৰিমাইণ্ডাৰসমূহ হৈছে: {titles}।"
            ids = [str(r.id) for r in pending]
        return {"patient_id": patient.id, "language": selected_language, "transcript": text, "response_text": response, "action": "list_reminders", "reminder_ids": ids}

    response = "I heard you, but I don't have an action for that yet. You can ask me about your reminders." if selected_language == "en" else "মই আপোনাৰ কথা শুনিলোঁ, কিন্তু এই কথাৰ বাবে এতিয়াও কোনো কাৰ্য নাই। আপুনি আপোনাৰ ৰিমাইণ্ডাৰৰ বিষয়ে সুধিব পাৰে।"
    return {"patient_id": patient.id, "language": selected_language, "transcript": text, "response_text": response, "action": "unknown", "reminder_ids": []}
