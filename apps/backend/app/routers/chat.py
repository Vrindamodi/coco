from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, require_roles
from app.core.security import AuthRole
from app.database import get_db
from app.models import Patient
from app.schemas.chat import ChatMessageResponse, ChatTurnResponse
from app.services.chat_service import list_chat_history, process_chat_message

router = APIRouter(prefix="/chat", tags=["chat"])


def _message_response(message) -> ChatMessageResponse:
    return ChatMessageResponse(
        id=str(message.id),
        patient_id=str(message.patient_id),
        role=message.role.value if hasattr(message.role, "value") else str(message.role),
        content=message.content,
        language=message.language,
        created_at=message.created_at,
    )


def _get_authenticated_patient(auth: AuthContext, db: Session) -> Patient:
    assert auth.patient_id is not None
    patient = db.get(Patient, auth.patient_id)
    if patient is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/history", response_model=list[ChatMessageResponse])
def get_chat_history(
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(require_roles(AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    patient = _get_authenticated_patient(auth, db)
    messages = list_chat_history(db, patient, limit=limit)
    return [_message_response(message) for message in messages]


@router.post("/message", response_model=ChatTurnResponse)
async def send_chat_message(
    text: str | None = Form(default=None),
    language: str | None = Form(default=None),
    audio: UploadFile | None = File(default=None),
    auth: AuthContext = Depends(require_roles(AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    patient = _get_authenticated_patient(auth, db)

    audio_bytes = None
    audio_filename = "recording.m4a"
    if audio is not None and audio.filename:
        audio_bytes = await audio.read()
        audio_filename = audio.filename

    result = process_chat_message(
        db,
        patient,
        text=text,
        audio_bytes=audio_bytes,
        audio_filename=audio_filename,
        language_override=language,
    )

    return ChatTurnResponse(
        transcript=result["transcript"],
        user_message=_message_response(result["user_message"]),
        assistant_message=_message_response(result["assistant_message"]),
    )
