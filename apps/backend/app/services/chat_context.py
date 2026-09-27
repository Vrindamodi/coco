from __future__ import annotations

from datetime import date, datetime, time, timezone

from sqlalchemy.orm import Session

from app.models import GameSession, MyWorldItem, Patient, Reminder
from app.models.enums import MyWorldCategory
from app.services.coco_engine import get_full_recommendation

LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "as": "Assamese",
    "bn": "Bengali",
}

# The journal is unbounded, but the prompt is not. Favourites and the entries
# the patient revisits come first, so a large journal still puts the memories
# that matter into the window.
MAX_WORLD_ITEMS = 30
# Stories are free text a caregiver typed; a very long one would crowd out the
# rest of the world.
MAX_STORY_CHARS = 400

CATEGORY_HEADINGS: dict[MyWorldCategory, str] = {
    MyWorldCategory.PERSON: "People in their life",
    MyWorldCategory.PLACE: "Places they know",
    MyWorldCategory.OBJECT: "Objects that matter to them",
    MyWorldCategory.EVENT: "Events they lived through",
    MyWorldCategory.MOMENT: "Moments they treasure",
}

CATEGORY_ORDER: list[MyWorldCategory] = [
    MyWorldCategory.PERSON,
    MyWorldCategory.PLACE,
    MyWorldCategory.EVENT,
    MyWorldCategory.MOMENT,
    MyWorldCategory.OBJECT,
]


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


def _age(date_of_birth: date | None) -> int | None:
    if date_of_birth is None:
        return None
    today = datetime.now(timezone.utc).date()
    years = today.year - date_of_birth.year
    if (today.month, today.day) < (date_of_birth.month, date_of_birth.day):
        years -= 1
    return years if 0 <= years < 130 else None


def _category(item: MyWorldItem) -> MyWorldCategory:
    """Rows loaded from a plain string column arrive un-coerced on SQLite."""
    if isinstance(item.category, MyWorldCategory):
        return item.category
    try:
        return MyWorldCategory(str(item.category))
    except ValueError:
        return MyWorldCategory.OBJECT


def _world_priority(item: MyWorldItem) -> tuple:
    """Favourites first, then the entries the patient actually revisits."""
    return (
        not item.is_favourite,
        -(item.times_shown or 0),
        item.sort_order,
        item.name.lower(),
    )


def _recognition_note(item: MyWorldItem) -> str | None:
    """Tell the model where gentle extra prompting helps."""
    if item.times_shown < 2 or item.success_rate is None:
        return None
    if item.success_rate < 0.5:
        return "often hard for them to recall — offer the details warmly"
    if item.success_rate >= 0.75:
        return "they usually recognise this"
    return None


def _describe_world_item(item: MyWorldItem) -> str:
    """One journal entry as a line the model can quote facts from."""
    headline = item.name
    if item.relationship:
        headline = f"{item.name} — their {item.relationship}"

    details: list[str] = []
    if item.description:
        details.append(item.description.strip())
    if item.memory_date:
        # "dated" invited the model to invent a span ("from 1985 to 2005");
        # this phrasing keeps it a single recorded day.
        details.append(f"this memory is from {item.memory_date.isoformat()}")
    people = [p for p in (item.people or []) if p]
    if people:
        details.append(f"with {', '.join(people)}")
    tags = [t for t in (item.tags or []) if t]
    if tags:
        details.append(f"tags: {', '.join(tags)}")
    note = _recognition_note(item)
    if note:
        details.append(note)

    line = f"  - {headline}"
    if details:
        line += f" ({'; '.join(details)})"

    if item.story:
        story = " ".join(item.story.split())
        if len(story) > MAX_STORY_CHARS:
            story = story[:MAX_STORY_CHARS].rstrip() + "…"
        line += f'\n      Story: "{story}"'

    return line


def _world_section(items: list[MyWorldItem]) -> list[str]:
    if not items:
        return [
            "My World journal: empty. The family has not added any memories yet, "
            "so you genuinely do not know their people or places."
        ]

    selected = sorted(items, key=_world_priority)[:MAX_WORLD_ITEMS]
    grouped: dict[MyWorldCategory, list[MyWorldItem]] = {}
    for item in selected:
        grouped.setdefault(_category(item), []).append(item)

    lines = [
        "My World journal (everything the family has recorded about this "
        "person — treat it as true and use it to answer their questions):"
    ]
    for category in CATEGORY_ORDER:
        rows = grouped.get(category)
        if not rows:
            continue
        lines.append(f"{CATEGORY_HEADINGS[category]}:")
        lines.extend(_describe_world_item(item) for item in rows)

    remaining = len(items) - len(selected)
    if remaining > 0:
        lines.append(
            f"({remaining} more memories exist in the app that are not listed here.)"
        )
    return lines


def build_patient_context(
    db: Session, patient: Patient, language: str | None = None
) -> str:
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

    # The phone's language choice is never written back to the patient row, so
    # the caller passes the resolved language; otherwise this line would
    # contradict the "respond only in" rule in the system prompt.
    lang_code = language or patient.preferred_language
    lang_name = LANGUAGE_NAMES.get(lang_code, "English")
    lines = [
        f"Patient name: {patient.full_name}",
        # Labelled as the interface setting, not as what to answer in: the
        # reply follows whichever language the patient just used.
        f"App interface language: {lang_name} ({lang_code})",
        f"Region: {patient.region or 'North East India'}",
    ]

    age = _age(patient.date_of_birth)
    if age is not None:
        lines.append(f"Age: {age}")

    caregiver = patient.caregiver
    if caregiver is not None:
        # The row records no relationship, so say only what is known — the
        # model otherwise fills the gap with an invented one.
        lines.append(
            f"Main caregiver (the family member who looks after them, "
            f"relationship not recorded): {caregiver.full_name}"
        )

    if patient.notes:
        notes = " ".join(patient.notes.split())
        lines.append(f"Caregiver notes: {notes}")

    lines += [
        f"Cognitive level: {patient.cognitive_level}/5",
        f"Suggested game difficulty: {ai_summary['difficulty']['recommended_level']}/5",
        f"Recommended cognitive focus: {ai_summary['personalization'].get('recommended_domain', 'memory')}",
        f"Content theme: {ai_summary['personalization'].get('content_theme', 'regional')}",
        f"Performance trend: {ai_summary['analytics'].get('overall_trend', 'stable')}",
        f"Today's date: {datetime.now(timezone.utc).date().isoformat()}",
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

    lines.extend(_world_section(my_world_rows))

    return "\n".join(lines)
