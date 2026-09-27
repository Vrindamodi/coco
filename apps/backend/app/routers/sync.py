from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, get_patient_for_auth, require_roles
from app.core.security import AuthRole
from app.database import get_db
from app.models import GameSession, MyWorldItem, Reminder, SyncOperation
from app.models.enums import GameType
from app.schemas.sync import SyncOperationResult, SyncPullResponse, SyncRequest, SyncResponse
from app.services.my_world import apply_reaction

router = APIRouter(prefix="/sync", tags=["sync"])


def _apply_game_result(db: Session, patient_id: UUID, payload: dict, client_timestamp):
    try:
        game_type = GameType(payload["game_type"])
        score = payload.get("score")
        duration_seconds = payload.get("duration_seconds")
        difficulty_level = payload.get("difficulty_level") or 1
        if score is not None and (not isinstance(score, int) or score < 0):
            raise ValueError("score must be a non-negative integer")
        if duration_seconds is not None and (not isinstance(duration_seconds, int) or duration_seconds < 0):
            raise ValueError("duration_seconds must be a non-negative integer")
        if not 1 <= int(difficulty_level) <= 5:
            raise ValueError("difficulty_level must be between 1 and 5")
    except (KeyError, ValueError) as exc:
        raise ValueError(f"Invalid game_result payload: {exc}") from exc

    session = GameSession(
        patient_id=patient_id,
        game_type=game_type,
        score=score,
        duration_seconds=duration_seconds,
        difficulty_level=int(difficulty_level),
        played_at=client_timestamp or datetime.now(timezone.utc),
    )
    db.add(session)
    db.flush()
    return session.id


def _apply_reminder_update(db: Session, patient_id: UUID, payload: dict, client_timestamp=None):
    try:
        reminder_id = UUID(str(payload["reminder_id"]))
    except (KeyError, ValueError) as exc:
        raise ValueError("Invalid reminder_id") from exc

    reminder = (
        db.query(Reminder)
        .filter(Reminder.id == reminder_id, Reminder.patient_id == patient_id)
        .first()
    )
    if reminder is None:
        raise ValueError("Reminder not found for patient")

    allowed = {"title", "message", "scheduled_at", "is_done"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise ValueError("No supported reminder fields to update")

    if "is_done" in updates:
        if not isinstance(updates["is_done"], bool):
            raise ValueError("is_done must be boolean")
        reminder.is_done = updates["is_done"]
        reminder.completed_at = datetime.now(timezone.utc) if reminder.is_done else None
    if "title" in updates:
        reminder.title = str(updates["title"])
    if "message" in updates:
        reminder.message = updates["message"]
    if "scheduled_at" in updates:
        from pydantic import TypeAdapter
        reminder.scheduled_at = TypeAdapter(datetime).validate_python(updates["scheduled_at"])

    db.flush()
    return reminder.id


def _apply_my_world_reaction(db: Session, patient_id: UUID, payload: dict, client_timestamp=None):
    try:
        item_id = UUID(str(payload["item_id"]))
    except (KeyError, ValueError) as exc:
        raise ValueError("Invalid item_id") from exc

    reaction = payload.get("reaction")
    if reaction not in {"viewed", "remembered", "unsure"}:
        raise ValueError("reaction must be one of: viewed, remembered, unsure")

    item = (
        db.query(MyWorldItem)
        .filter(MyWorldItem.id == item_id, MyWorldItem.patient_id == patient_id)
        .first()
    )
    if item is None:
        raise ValueError("My World item not found for patient")

    apply_reaction(item, reaction, client_timestamp)
    db.flush()
    return item.id


_HANDLERS = {
    "game_result": _apply_game_result,
    "reminder_update": _apply_reminder_update,
    "my_world_reaction": _apply_my_world_reaction,
}


@router.post("", response_model=SyncResponse)
def sync_operations(
    payload: SyncRequest,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    results: list[SyncOperationResult] = []
    synced = duplicates = failed = 0

    for operation in payload.operations:
        get_patient_for_auth(operation.patient_id, auth, db)

        existing = (
            db.query(SyncOperation)
            .filter(
                SyncOperation.device_id == operation.device_id,
                SyncOperation.operation_id == operation.operation_id,
            )
            .first()
        )
        if existing is not None:
            duplicates += 1
            results.append(SyncOperationResult(
                operation_id=operation.operation_id,
                status="duplicate",
                resource_id=existing.id.__str__(),
            ))
            continue

        # Commit the audit row first: a rollback of the mutation below must
        # not erase the record that this operation_id was already seen, or a
        # permanently-failing operation would be retried forever.
        record = SyncOperation(
            operation_id=operation.operation_id,
            device_id=operation.device_id,
            patient_id=operation.patient_id,
            operation_type=operation.operation_type,
            payload=operation.payload,
            status="pending",
            client_timestamp=operation.client_timestamp,
        )
        db.add(record)
        db.commit()

        try:
            handler = _HANDLERS[operation.operation_type]
            resource_id = handler(
                db,
                operation.patient_id,
                operation.payload,
                operation.client_timestamp,
            )
            record.status = "synced"
            record.processed_at = datetime.now(timezone.utc)
            db.commit()
            synced += 1
            results.append(SyncOperationResult(
                operation_id=operation.operation_id,
                status="synced",
                resource_id=str(resource_id),
            ))
        except Exception as exc:
            db.rollback()
            record.status = "failed"
            record.error_message = str(exc)[:500]
            record.processed_at = datetime.now(timezone.utc)
            db.commit()
            failed += 1
            results.append(SyncOperationResult(
                operation_id=operation.operation_id,
                status="failed",
                error=str(exc),
            ))

    return SyncResponse(
        synced=synced,
        duplicates=duplicates,
        failed=failed,
        results=results,
    )


@router.get("/pull/{patient_id}", response_model=SyncPullResponse)
def pull_changes(
    patient_id: UUID,
    since: datetime | None = None,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    get_patient_for_auth(patient_id, auth, db)

    reminder_query = db.query(Reminder).filter(Reminder.patient_id == patient_id)
    game_query = db.query(GameSession).filter(GameSession.patient_id == patient_id)
    world_query = db.query(MyWorldItem).filter(MyWorldItem.patient_id == patient_id)

    if since is not None:
        reminder_query = reminder_query.filter(Reminder.updated_at > since)
        game_query = game_query.filter(GameSession.created_at > since)
        world_query = world_query.filter(MyWorldItem.updated_at > since)

    reminders = reminder_query.order_by(Reminder.updated_at).all()
    sessions = game_query.order_by(GameSession.created_at).all()
    world_items = world_query.order_by(MyWorldItem.updated_at).all()

    return SyncPullResponse(
        server_time=datetime.now(timezone.utc),
        since=since,
        reminders=[{
            "id": str(r.id), "patient_id": str(r.patient_id), "title": r.title,
            "message": r.message, "reminder_type": r.reminder_type.value,
            "scheduled_at": r.scheduled_at, "is_done": r.is_done,
            "completed_at": r.completed_at, "is_sent": r.is_sent,
            "updated_at": r.updated_at,
        } for r in reminders],
        game_sessions=[{
            "id": str(s.id), "patient_id": str(s.patient_id),
            "game_type": s.game_type.value, "score": s.score,
            "duration_seconds": s.duration_seconds,
            "difficulty_level": s.difficulty_level, "played_at": s.played_at,
            "created_at": s.created_at,
        } for s in sessions],
        my_world_items=[{
            "id": str(i.id), "patient_id": str(i.patient_id),
            "category": i.category.value, "name": i.name,
            "relationship": i.relationship, "description": i.description,
            "photo_uri": i.photo_uri,
            "media_type": i.media_type.value, "media_uri": i.media_uri,
            "thumbnail_uri": i.thumbnail_uri, "media_bytes": i.media_bytes,
            "story": i.story, "memory_date": i.memory_date,
            "people": i.people or [], "tags": i.tags or [],
            "is_favourite": i.is_favourite, "sort_order": i.sort_order,
            "success_rate": i.success_rate,
            "times_shown": i.times_shown, "remembered_count": i.remembered_count,
            "last_shown_at": i.last_shown_at, "last_viewed_at": i.last_viewed_at,
            "created_at": i.created_at, "updated_at": i.updated_at,
        } for i in world_items],
    )
