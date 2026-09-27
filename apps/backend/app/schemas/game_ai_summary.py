"""
New schemas for GET /games/ai-summary/{patient_id}.

Add these classes into apps/backend/app/schemas/game.py (append to the
existing file - don't replace it, it already has GameSessionCreate /
GameSessionResponse / DifficultyResponse that stay as-is).
"""

from typing import Optional
from pydantic import BaseModel


class DifficultyDetail(BaseModel):
    recommended_level: int
    decision: str
    reason: str
    trend: str
    confidence: float
    ml_agrees: Optional[bool] = None
    ml_prediction: Optional[str] = None


class PersonalizationDetail(BaseModel):
    recommended_domain: str
    activity_hint: Optional[str] = None
    my_world_item_id: Optional[str] = None
    content_theme: str
    theme_label: str
    preferred_language: Optional[str] = None
    my_world_available: bool
    reason: str


class DomainAnalytics(BaseModel):
    average_performance: float
    trend: str
    slope: float
    sessions_played: int


class AnalyticsDetail(BaseModel):
    overall_trend: str
    overall_slope: float
    decline_alert: bool
    domains: dict[str, DomainAnalytics]
    strongest_domain: Optional[str] = None
    weakest_domain: Optional[str] = None
    sessions_last_7_days: int
    total_sessions: int


class AISummaryResponse(BaseModel):
    patient_id: str
    difficulty: DifficultyDetail
    personalization: PersonalizationDetail
    analytics: AnalyticsDetail
