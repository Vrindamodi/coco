from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import GameType


class GameSessionCreate(BaseModel):
    patient_id: str
    game_type: GameType
    score: Optional[int] = Field(default=None, ge=0)
    duration_seconds: Optional[int] = Field(default=None, ge=0)
    difficulty_level: Optional[int] = Field(default=None, ge=1, le=5)


class GameSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    game_type: GameType
    score: Optional[int] = None
    duration_seconds: Optional[int] = None
    difficulty_level: int
    played_at: datetime


class DifficultyResponse(BaseModel):
    patient_id: str
    suggested_difficulty: int
    cognitive_level: int
