"""
Caregiver monitoring alert engine.

Creates/resolves persisted alerts for:
  - cognitive_decline (high): analytics decline_alert
  - inactivity (medium): no sessions in INACTIVITY_DAYS
  - missed_reminder (medium): today's overdue incomplete reminders
"""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import Alert, GameSession, Patient, Reminder
from app.models.enums import AlertSeverity, AlertStatus, AlertType
from app.services.coco_engine import analyze_performance

# Documented thresholds (not caregiver-configurable in this build)
INACTIVITY_DAYS = 3
DECLINE_SLOPE_THRESHOLD = -0.02


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _enum_val(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _active_alerts(
    db: Session,
    patient_id,
    alert_type: AlertType,
    source_ref: str | None = None,
) -> list[Alert]:
    q = (
        db.query(Alert)
        .filter(
            Alert.patient_id == patient_id,
            Alert.alert_type == alert_type,
            Alert.status == AlertStatus.ACTIVE,
        )
    )
    if source_ref is None:
        q = q.filter(Alert.source_ref.is_(None))
    else:
        q = q.filter(Alert.source_ref == source_ref)
    return q.all()


def _ensure_alert(
    db: Session,
    patient: Patient,
    *,
    alert_type: AlertType,
    severity: AlertSeverity,
    title: str,
    message: str,
    source_ref: str | None = None,
) -> Alert:
    existing = _active_alerts(db, patient.id, alert_type, source_ref)
    if existing:
        alert = existing[0]
        alert.title = title
        alert.message = message
        alert.severity = severity
        return alert

    alert = Alert(
        patient_id=patient.id,
        caregiver_id=patient.caregiver_id,
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
        status=AlertStatus.ACTIVE,
        source_ref=source_ref,
    )
    db.add(alert)
    return alert


def _resolve_active(
    db: Session,
    patient_id,
    alert_type: AlertType,
    source_ref: str | None = None,
) -> None:
    now = _utcnow()
    for alert in _active_alerts(db, patient_id, alert_type, source_ref):
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = now


def _check_cognitive_decline(db: Session, patient: Patient, sessions) -> None:
    analytics = analyze_performance(sessions)
    if analytics.get("decline_alert"):
        trend = analytics.get("overall_trend", "declining")
        weakest = analytics.get("weakest_domain")
        weakest_label = (weakest or "overall").replace("_", " ")
        _ensure_alert(
            db,
            patient,
            alert_type=AlertType.COGNITIVE_DECLINE,
            severity=AlertSeverity.HIGH,
            title="Cognitive decline signal",
            message=(
                f"Performance trend is {trend} for {patient.full_name}. "
                f"Focus area: {weakest_label}."
            ),
        )
    else:
        _resolve_active(db, patient.id, AlertType.COGNITIVE_DECLINE)


def _check_inactivity(db: Session, patient: Patient, sessions) -> None:
    now = _utcnow()
    cutoff = now - timedelta(days=INACTIVITY_DAYS)
    created = patient.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    if not sessions:
        # Only alert if the patient profile is older than the inactivity window
        if created <= cutoff:
            _ensure_alert(
                db,
                patient,
                alert_type=AlertType.INACTIVITY,
                severity=AlertSeverity.MEDIUM,
                title="No recent activity",
                message=(
                    f"{patient.full_name} has not played any cognitive games yet "
                    f"(profile older than {INACTIVITY_DAYS} days)."
                ),
            )
        else:
            _resolve_active(db, patient.id, AlertType.INACTIVITY)
        return

    last_played = sessions[0].played_at
    if last_played.tzinfo is None:
        last_played = last_played.replace(tzinfo=timezone.utc)

    if last_played < cutoff:
        days = (now - last_played).days
        _ensure_alert(
            db,
            patient,
            alert_type=AlertType.INACTIVITY,
            severity=AlertSeverity.MEDIUM,
            title="Inactivity detected",
            message=(
                f"{patient.full_name} has not played in {days} days "
                f"(threshold: {INACTIVITY_DAYS} days)."
            ),
        )
    else:
        _resolve_active(db, patient.id, AlertType.INACTIVITY)


def _check_missed_reminders(db: Session, patient: Patient) -> None:
    now = _utcnow()
    start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    end = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)

    reminders = (
        db.query(Reminder)
        .filter(
            Reminder.patient_id == patient.id,
            Reminder.scheduled_at >= start,
            Reminder.scheduled_at <= end,
        )
        .all()
    )

    overdue_ids = set()
    for reminder in reminders:
        scheduled = reminder.scheduled_at
        if scheduled.tzinfo is None:
            scheduled = scheduled.replace(tzinfo=timezone.utc)
        if not reminder.is_done and scheduled < now:
            overdue_ids.add(str(reminder.id))
            type_label = _enum_val(reminder.reminder_type).replace("_", " ")
            _ensure_alert(
                db,
                patient,
                alert_type=AlertType.MISSED_REMINDER,
                severity=AlertSeverity.MEDIUM,
                title=f"Missed reminder: {reminder.title}",
                message=(
                    f"{patient.full_name} missed a {type_label} reminder "
                    f"scheduled at {scheduled.strftime('%H:%M')}."
                ),
                source_ref=str(reminder.id),
            )

    # Resolve active missed-reminder alerts whose reminder is done or gone
    active_missed = (
        db.query(Alert)
        .filter(
            Alert.patient_id == patient.id,
            Alert.alert_type == AlertType.MISSED_REMINDER,
            Alert.status == AlertStatus.ACTIVE,
        )
        .all()
    )
    for alert in active_missed:
        if alert.source_ref and alert.source_ref not in overdue_ids:
            alert.status = AlertStatus.RESOLVED
            alert.resolved_at = now


def evaluate_patient(db: Session, patient: Patient) -> list[Alert]:
    """Run all alert checks for one patient and return active alerts."""
    sessions = (
        db.query(GameSession)
        .filter(GameSession.patient_id == patient.id)
        .order_by(GameSession.played_at.desc())
        .limit(30)
        .all()
    )

    _check_cognitive_decline(db, patient, sessions)
    _check_inactivity(db, patient, sessions)
    _check_missed_reminders(db, patient)

    db.commit()

    return (
        db.query(Alert)
        .filter(
            Alert.patient_id == patient.id,
            Alert.status == AlertStatus.ACTIVE,
        )
        .order_by(Alert.created_at.desc())
        .all()
    )


def evaluate_caregiver_patients(db: Session, caregiver_id) -> None:
    patients = (
        db.query(Patient)
        .filter(Patient.caregiver_id == caregiver_id)
        .all()
    )
    for patient in patients:
        evaluate_patient(db, patient)
