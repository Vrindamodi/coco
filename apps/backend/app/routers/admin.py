from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, require_roles
from app.core.security import AuthRole
from app.database import get_db
from app.models import GameSession, Patient, User
from app.models.enums import UserRole
from app.schemas.admin import PlatformStats, SystemHealthResponse
from app.services.reminders import ping_redis

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=PlatformStats)
def get_platform_stats(
    auth: AuthContext = Depends(require_roles(AuthRole.ADMIN)),
    db: Session = Depends(get_db),
):
    total_patients = db.query(func.count(Patient.id)).scalar() or 0
    total_caregivers = (
        db.query(func.count(User.id)).filter(User.role == UserRole.CAREGIVER).scalar()
        or 0
    )
    total_sessions = db.query(func.count(GameSession.id)).scalar() or 0

    region_rows = (
        db.query(Patient.region, func.count(Patient.id))
        .group_by(Patient.region)
        .all()
    )
    regions = {
        (region or "Unknown"): count for region, count in region_rows
    }

    return PlatformStats(
        total_patients=total_patients,
        total_caregivers=total_caregivers,
        total_sessions=total_sessions,
        regions=regions,
    )


@router.get("/health", response_model=SystemHealthResponse)
def get_system_health(
    auth: AuthContext = Depends(require_roles(AuthRole.ADMIN)),
    db: Session = Depends(get_db),
):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    redis_ok = ping_redis()
    status_label = "ok" if db_ok and redis_ok else "degraded"

    return SystemHealthResponse(
        status=status_label,
        database="ok" if db_ok else "error",
        redis="ok" if redis_ok else "error",
    )
