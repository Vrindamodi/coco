from uuid import UUID

from sqlalchemy.orm import Session

from app.config import settings
from app.models import GameSession
from app.services.coco_engine import recommend_difficulty


def get_next_difficulty(db: Session, patient_id: UUID, cognitive_level: int) -> int:
    """
    Returns the recommended difficulty level (1-5) for a patient's next
    game session, using COCO's two-layer adaptive engine:
      - Layer 1: deterministic Elo/IRT-style rule engine (always runs)
      - Layer 2: trained Random Forest cross-check (runs if the model
        artifact is present; degrades gracefully if not)

    Signature is unchanged from the original stub - no changes needed in
    routers/games.py.
    """
    sessions = (
        db.query(GameSession)
        .filter(GameSession.patient_id == patient_id)
        .order_by(GameSession.played_at.desc())
        .limit(5)
        .all()
    )
    result = recommend_difficulty(sessions, cognitive_level)
    return result["recommended_level"]
