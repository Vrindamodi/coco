from __future__ import annotations

from datetime import datetime, time, timezone

from sqlalchemy.orm import Session

from app.models import GameSession, MyWorldItem, Patient, Reminder
from app.services.coco_engine import get_full_recommendation

LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "as": "Assamese",
    "bn": "Bengali",
}


def _today_reminders(db: Session, patient_id) -> list[Reminder]:
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


def build_patient_context(db: Session, patient: Patient) -> str:
    reminders = _today_reminders(db, patient.id)
    pending = [r for r in reminders if not r.is_done]

    sessions = (
        db.query(GameSession)
        .filter(GameSession.patient_id == patient.id)
        .order_by(GameSession.played_at.desc())
        .limit(10)
        .all()
    )

    my_world_rows = (
        db.query(MyWorldItem)
        .filter(MyWorldItem.patient_id == patient.id)
        .all()
    )
    my_world_items = [
        {
            "id": str(item.id),
            "name": item.name,
            "relationship": item.relationship,
            "success_rate": item.success_rate,
            "last_shown_at": (
                item.last_shown_at.isoformat() if item.last_shown_at else None
            ),
        }
        for item in my_world_rows
    ]

    ai_summary = get_full_recommendation(sessions, patient, my_world_items=my_world_items)

    lang_name = LANGUAGE_NAMES.get(patient.preferred_language, "English")
    lines = [
        f"Patient name: {patient.full_name}",
        f"Preferred language: {lang_name} ({patient.preferred_language})",
        f"Region: {patient.region or 'North East India'}",
        f"Cognitive level: {patient.cognitive_level}/5",
        f"Suggested game difficulty: {ai_summary['difficulty']['recommended_level']}/5",
        f"Recommended cognitive focus: {ai_summary['personalization'].get('recommended_domain', 'memory')}",
        f"Content theme: {ai_summary['personalization'].get('content_theme', 'regional')}",
        f"Performance trend: {ai_summary['analytics'].get('overall_trend', 'stable')}",
    ]

    if pending:
        lines.append("Today's pending reminders:")
        for reminder in pending[:5]:
            time_str = reminder.scheduled_at.strftime("%H:%M")
            lines.append(
                f"  - {reminder.title} ({reminder.reminder_type.value}) at {time_str}"
            )
    else:
        lines.append("No pending reminders for today.")

    if my_world_rows:
        names = ", ".join(item.name for item in my_world_rows[:5])
        lines.append(f"Familiar people/places from My World: {names}")

    return "\n".join(lines)
