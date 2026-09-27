from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, get_patient_for_auth, require_roles
from app.core.security import AuthRole
from app.database import get_db
from app.schemas.voice import VoiceCommandRequest, VoiceCommandResponse, VoiceConfigResponse
from app.services.voice import get_voice_config, process_voice_command

router = APIRouter(prefix="/voice", tags=["voice"])


@router.get("/config/{patient_id}", response_model=VoiceConfigResponse)
def voice_config(
    patient_id,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_auth(patient_id, auth, db)
    return get_voice_config(patient)


@router.post("/command", response_model=VoiceCommandResponse)
def voice_command(
    payload: VoiceCommandRequest,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_auth(payload.patient_id, auth, db)
    return process_voice_command(db, patient, payload.text, payload.language)
