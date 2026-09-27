from datetime import datetime, time, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, get_patient_for_auth, require_roles
from app.core.security import AuthRole
from app.database import get_db
from app.models import Patient, Reminder
from app.schemas.reminder import ReminderCreate, ReminderResponse, ReminderUpdate
from app.services.alert_engine import evaluate_patient
from app.services.reminders import enqueue_reminder


def _evaluate_patient_alerts(db: Session, patient_id: UUID) -> None:
    patient = db.get(Patient, patient_id)
    if patient is not None:
        evaluate_patient(db, patient)

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _reminder_response(reminder: Reminder) -> ReminderResponse:
    return ReminderResponse(
        id=str(reminder.id),
        patient_id=str(reminder.patient_id),
        title=reminder.title,
        message=reminder.message,
        reminder_type=reminder.reminder_type,
        scheduled_at=reminder.scheduled_at,
        is_done=reminder.is_done,
        completed_at=reminder.completed_at,
        is_sent=reminder.is_sent,
    )


@router.get("/", response_model=list[ReminderResponse])
def list_reminders(
    patient_id: UUID = Query(...),
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    get_patient_for_auth(patient_id, auth, db)
    now = datetime.now(timezone.utc)
    start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    end = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)

    reminders = (
        db.query(Reminder)
        .filter(
            Reminder.patient_id == patient_id,
            Reminder.scheduled_at >= start,
            Reminder.scheduled_at <= end,
        )
        .order_by(Reminder.scheduled_at)
        .all()
    )
    return [_reminder_response(r) for r in reminders]


@router.post("/", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: ReminderCreate,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER)),
    db: Session = Depends(get_db),
):
    patient_uuid = UUID(payload.patient_id)
    get_patient_for_auth(patient_uuid, auth, db)

    reminder = Reminder(
        patient_id=patient_uuid,
        title=payload.title,
        message=payload.message,
        reminder_type=payload.reminder_type,
        scheduled_at=payload.scheduled_at,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    enqueue_reminder(reminder.id)
    _evaluate_patient_alerts(db, patient_uuid)
    return _reminder_response(reminder)


@router.patch("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: UUID,
    payload: ReminderUpdate,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    reminder = db.get(Reminder, reminder_id)
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")

    get_patient_for_auth(reminder.patient_id, auth, db)

    data = payload.model_dump(exclude_unset=True)
    if data.get("is_done") is True and reminder.completed_at is None:
        reminder.completed_at = datetime.now(timezone.utc)
    if data.get("is_done") is False:
        reminder.completed_at = None

    for key, value in data.items():
        setattr(reminder, key, value)

    db.commit()
    db.refresh(reminder)
    _evaluate_patient_alerts(db, reminder.patient_id)
    return _reminder_response(reminder)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: UUID,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER)),
    db: Session = Depends(get_db),
):
    reminder = db.get(Reminder, reminder_id)
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")
    patient_id = reminder.patient_id
    get_patient_for_auth(patient_id, auth, db)
    db.delete(reminder)
    db.commit()
    _evaluate_patient_alerts(db, patient_id)
