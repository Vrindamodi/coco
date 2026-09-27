from app.models.my_world_item import MyWorldItem
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, get_patient_for_auth, require_roles
from app.core.security import AuthRole
from app.database import get_db
from app.models import GameSession
from app.schemas.game import DifficultyResponse, GameSessionCreate, GameSessionResponse
from app.services.adaptive import get_next_difficulty

from app.schemas.game_ai_summary import AISummaryResponse
from app.services.coco_engine import get_full_recommendation

router = APIRouter(prefix="/games", tags=["games"])


def _session_response(session: GameSession) -> GameSessionResponse:
    return GameSessionResponse(
        id=str(session.id),
        patient_id=str(session.patient_id),
        game_type=session.game_type,
        score=session.score,
        duration_seconds=session.duration_seconds,
        difficulty_level=session.difficulty_level,
        played_at=session.played_at,
    )


@router.get("/sessions", response_model=list[GameSessionResponse])
def list_game_sessions(
    patient_id: UUID = Query(...),
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    get_patient_for_auth(patient_id, auth, db)
    sessions = (
        db.query(GameSession)
        .filter(GameSession.patient_id == patient_id)
        .order_by(GameSession.played_at.desc())
        .all()
    )
    return [_session_response(s) for s in sessions]


@router.post("/sessions", response_model=GameSessionResponse, status_code=201)
def create_game_session(
    payload: GameSessionCreate,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    patient_uuid = UUID(payload.patient_id)
    patient = get_patient_for_auth(patient_uuid, auth, db)

    difficulty = payload.difficulty_level or get_next_difficulty(
        db, patient.id, patient.cognitive_level
    )

    session = GameSession(
        patient_id=patient.id,
        game_type=payload.game_type,
        score=payload.score,
        duration_seconds=payload.duration_seconds,
        difficulty_level=difficulty,
        played_at=datetime.now(timezone.utc),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    from app.services.alert_engine import evaluate_patient

    evaluate_patient(db, patient)

    return _session_response(session)


@router.get("/difficulty/{patient_id}", response_model=DifficultyResponse)
def get_difficulty(
    patient_id: UUID,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_auth(patient_id, auth, db)
    suggested = get_next_difficulty(db, patient.id, patient.cognitive_level)
    return DifficultyResponse(
        patient_id=str(patient.id),
        suggested_difficulty=suggested,
        cognitive_level=patient.cognitive_level,
    )


@router.get("/ai-summary/{patient_id}", response_model=AISummaryResponse)
def get_ai_summary(
    patient_id: UUID,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.PATIENT)),
    db: Session = Depends(get_db),
):
    """
    COCO's full AI engine output for this patient in one call:
      - difficulty:      next recommended game difficulty (1-5)
      - personalization: which cognitive domain + content theme to serve
                          next, using NER regional themes and (once
                          Module 8 exists) My World photo data
      - analytics:       per-domain trends, adherence, decline alerts
                          for the caregiver dashboard
    """
    patient = get_patient_for_auth(patient_id, auth, db)

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
                item.last_shown_at.isoformat()
                if item.last_shown_at
                else None
            ),
        }
        for item in my_world_rows
    ]

    result = get_full_recommendation(
        sessions,
        patient,
        my_world_items=my_world_items,
    )

    return AISummaryResponse(
        patient_id=str(patient.id),
        difficulty=result["difficulty"],
        personalization=result["personalization"],
        analytics=result["analytics"],
    )