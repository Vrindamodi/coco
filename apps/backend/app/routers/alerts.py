from collections import Counter
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, require_roles
from app.core.security import AuthRole
from app.database import get_db
from app.models import Alert, Patient
from app.models.enums import AlertStatus
from app.schemas.alert import AlertResponse, AlertSummary, AlertUpdate
from app.services.alert_engine import evaluate_caregiver_patients

router = APIRouter(prefix="/alerts", tags=["alerts"])


def _alert_response(alert: Alert, patient_name: str | None = None) -> AlertResponse:
    return AlertResponse(
        id=str(alert.id),
        patient_id=str(alert.patient_id),
        caregiver_id=str(alert.caregiver_id),
        alert_type=alert.alert_type.value
        if hasattr(alert.alert_type, "value")
        else str(alert.alert_type),
        severity=alert.severity.value
        if hasattr(alert.severity, "value")
        else str(alert.severity),
        title=alert.title,
        message=alert.message,
        status=alert.status.value if hasattr(alert.status, "value") else str(alert.status),
        source_ref=alert.source_ref,
        created_at=alert.created_at,
        acknowledged_at=alert.acknowledged_at,
        resolved_at=alert.resolved_at,
        patient_name=patient_name,
    )


def _caregiver_id(auth: AuthContext) -> UUID:
    if auth.user_id is None:
        raise HTTPException(status_code=403, detail="Caregiver context required")
    return auth.user_id


@router.get("/", response_model=list[AlertResponse])
def list_alerts(
    status_filter: str | None = Query(default=None, alias="status"),
    patient_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.ADMIN)),
    db: Session = Depends(get_db),
):
    caregiver_id = _caregiver_id(auth)
    evaluate_caregiver_patients(db, caregiver_id)

    query = db.query(Alert).filter(Alert.caregiver_id == caregiver_id)

    if patient_id is not None:
        patient = db.get(Patient, patient_id)
        if patient is None or patient.caregiver_id != caregiver_id:
            raise HTTPException(status_code=403, detail="Access denied")
        query = query.filter(Alert.patient_id == patient_id)

    if status_filter:
        try:
            status_enum = AlertStatus(status_filter)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        query = query.filter(Alert.status == status_enum)

    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()

    names = {}
    for alert in alerts:
        if alert.patient_id not in names:
            patient = db.get(Patient, alert.patient_id)
            names[alert.patient_id] = patient.full_name if patient else None

    return [_alert_response(a, names.get(a.patient_id)) for a in alerts]


@router.get("/summary", response_model=AlertSummary)
def alerts_summary(
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.ADMIN)),
    db: Session = Depends(get_db),
):
    caregiver_id = _caregiver_id(auth)
    evaluate_caregiver_patients(db, caregiver_id)

    active = (
        db.query(Alert)
        .filter(
            Alert.caregiver_id == caregiver_id,
            Alert.status == AlertStatus.ACTIVE,
        )
        .all()
    )

    by_type: Counter[str] = Counter()
    high_count = 0
    for alert in active:
        type_val = (
            alert.alert_type.value
            if hasattr(alert.alert_type, "value")
            else str(alert.alert_type)
        )
        by_type[type_val] += 1
        sev = (
            alert.severity.value
            if hasattr(alert.severity, "value")
            else str(alert.severity)
        )
        if sev == "high":
            high_count += 1

    return AlertSummary(
        active_count=len(active),
        high_count=high_count,
        by_type=dict(by_type),
    )


@router.post("/evaluate", response_model=AlertSummary)
def evaluate_alerts(
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.ADMIN)),
    db: Session = Depends(get_db),
):
    return alerts_summary(auth=auth, db=db)


@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: UUID,
    payload: AlertUpdate,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.ADMIN)),
    db: Session = Depends(get_db),
):
    caregiver_id = _caregiver_id(auth)
    alert = db.get(Alert, alert_id)
    if alert is None or alert.caregiver_id != caregiver_id:
        raise HTTPException(status_code=404, detail="Alert not found")

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    if payload.status == "acknowledged":
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = now
    elif payload.status == "resolved":
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = now
    else:
        raise HTTPException(status_code=400, detail="Invalid status")

    db.commit()
    db.refresh(alert)

    patient = db.get(Patient, alert.patient_id)
    return _alert_response(alert, patient.full_name if patient else None)
