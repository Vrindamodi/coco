from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, get_patient_for_auth, require_roles
from app.core.security import AuthRole
from app.database import get_db
from app.schemas.progress import ProgressMetrics
from app.services.progress import compute_progress_metrics

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/me", response_model=ProgressMetrics)
def get_my_progress(
    auth: AuthContext = Depends(require_roles(AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return compute_progress_metrics(db, auth.patient_id)


@router.get("/{patient_id}", response_model=ProgressMetrics)
def get_patient_progress(
    patient_id: UUID,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    get_patient_for_auth(patient_id, auth, db)
    return compute_progress_metrics(db, patient_id)
