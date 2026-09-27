"""Shared My World engagement logic.

Both the HTTP endpoints and the offline sync queue funnel through here so a
reaction recorded on a plane and one recorded online update a memory the
same way.
"""

from datetime import datetime, timezone

from app.models.my_world_item import MyWorldItem


def _blend_success_rate(item: MyWorldItem, correct: float) -> None:
    """Incremental mean of recognition outcomes, seeded at 0.5."""
    old_rate = item.success_rate if item.success_rate is not None else 0.5
    item.success_rate = old_rate + (correct - old_rate) / item.times_shown


def record_recognition(item: MyWorldItem, was_correct: bool) -> MyWorldItem:
    """Recognition-drill outcome (the cognitive games call this)."""
    item.times_shown += 1
    _blend_success_rate(item, 1.0 if was_correct else 0.0)
    item.last_shown_at = datetime.now(timezone.utc)
    return item


def apply_reaction(
    item: MyWorldItem,
    reaction: str,
    at: datetime | None = None,
) -> MyWorldItem:
    """Journal reaction from the patient's My World gallery.

    ``at`` is the client timestamp, so a reaction that sat in the offline
    outbox for two days is attributed to when the patient actually tapped.
    """
    when = at or datetime.now(timezone.utc)
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)

    item.times_shown += 1
    item.last_viewed_at = when

    if reaction == "remembered":
        item.remembered_count += 1
        _blend_success_rate(item, 1.0)
        item.last_shown_at = when
    elif reaction == "unsure":
        _blend_success_rate(item, 0.0)
        item.last_shown_at = when
    elif reaction != "viewed":
        raise ValueError(f"Unknown reaction: {reaction}")

    return item
