from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import GameSession
from app.schemas.progress import ProgressMetrics


def compute_progress_metrics(db: Session, patient_id: UUID) -> ProgressMetrics:
    sessions = (
        db.query(GameSession)
        .filter(GameSession.patient_id == patient_id)
        .order_by(GameSession.played_at.desc())
        .all()
    )

    if not sessions:
        return ProgressMetrics(
            patient_id=str(patient_id),
            total_sessions=0,
            average_score=0.0,
            streak_days=0,
            last_active=None,
        )

    total = len(sessions)
    scores = [s.score for s in sessions if s.score is not None]
    average = sum(scores) / len(scores) if scores else 0.0
    last_active = sessions[0].played_at

    play_dates = {
        s.played_at.astimezone(timezone.utc).date()
        for s in sessions
        if s.played_at is not None
    }
    streak = _calculate_streak(play_dates)

    return ProgressMetrics(
        patient_id=str(patient_id),
        total_sessions=total,
        average_score=round(average, 1),
        streak_days=streak,
        last_active=last_active,
    )


def _calculate_streak(play_dates: set) -> int:
    if not play_dates:
        return 0
    streak = 0
    current = datetime.now(timezone.utc).date()
    while current in play_dates:
        streak += 1
        current -= timedelta(days=1)
    return streak
