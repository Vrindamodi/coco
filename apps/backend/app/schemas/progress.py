from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProgressMetrics(BaseModel):
    patient_id: str
    total_sessions: int
    average_score: float
    streak_days: int
    last_active: Optional[datetime] = None
