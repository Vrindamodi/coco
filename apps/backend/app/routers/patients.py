from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, get_patient_for_auth, require_roles
from app.core.security import AuthRole, hash_password
from app.database import get_db
from app.models import Patient
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate

router = APIRouter(prefix="/patients", tags=["patients"])


def _patient_response(patient: Patient) -> PatientResponse:
    return PatientResponse(
        id=str(patient.id),
        caregiver_id=str(patient.caregiver_id),
        full_name=patient.full_name,
        date_of_birth=patient.date_of_birth,
        region=patient.region,
        notes=patient.notes,
        preferred_language=patient.preferred_language,
        photo_uri=patient.photo_uri,
        cognitive_level=patient.cognitive_level,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
    )


@router.get("/", response_model=list[PatientResponse])
def list_patients(
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER)),
    db: Session = Depends(get_db),
):
    patients = (
        db.query(Patient)
        .filter(Patient.caregiver_id == auth.user_id)
        .order_by(Patient.full_name)
        .all()
    )
    return [_patient_response(p) for p in patients]


@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER)),
    db: Session = Depends(get_db),
):
    patient = Patient(
        caregiver_id=auth.user_id,
        full_name=payload.full_name,
        date_of_birth=payload.date_of_birth,
        region=payload.region,
        notes=payload.notes,
        preferred_language=payload.preferred_language,
        photo_uri=payload.photo_uri,
        pin_hash=hash_password(payload.pin) if payload.pin else None,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return _patient_response(patient)


@router.get("/me", response_model=PatientResponse)
def get_my_patient(
    auth: AuthContext = Depends(require_roles(AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    if auth.patient_id is None:
        raise HTTPException(status_code=400, detail="Patient context required")
    patient = get_patient_for_auth(auth.patient_id, auth, db)
    return _patient_response(patient)


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: UUID,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_auth(patient_id, auth, db)
    return _patient_response(patient)


@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: UUID,
    payload: PatientUpdate,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER)),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_auth(patient_id, auth, db)
    data = payload.model_dump(exclude_unset=True)
    if "pin" in data:
        pin = data.pop("pin")
        patient.pin_hash = hash_password(pin) if pin else None
    for key, value in data.items():
        setattr(patient, key, value)
    db.commit()
    db.refresh(patient)
    return _patient_response(patient)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: UUID,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER)),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_auth(patient_id, auth, db)
    db.delete(patient)
    db.commit()
