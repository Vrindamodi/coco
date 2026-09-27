from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import GameType


class SyncOperationCreate(BaseModel):
    operation_id: str = Field(min_length=1, max_length=100)
    device_id: str = Field(min_length=1, max_length=255)
    patient_id: UUID
    operation_type: Literal["game_result", "reminder_update", "my_world_reaction"]
    payload: dict[str, Any] = Field(default_factory=dict)
    client_timestamp: datetime | None = None


class GameResultPayload(BaseModel):
    """Body of a `game_result` operation. Mirrors `GameSessionCreate` minus
    the patient (carried by the operation) plus the client-chosen id."""

    model_config = ConfigDict(extra="ignore")

    session_id: UUID | None = None
    game_type: GameType
    score: int | None = Field(default=None, ge=0, le=100)
    duration_seconds: int | None = Field(default=None, ge=0)
    difficulty_level: int | None = Field(default=None, ge=1, le=5)
    hints_used: int | None = Field(default=None, ge=0)


class SyncRequest(BaseModel):
    operations: list[SyncOperationCreate] = Field(default_factory=list, max_length=100)


class SyncOperationResult(BaseModel):
    operation_id: str
    status: Literal["synced", "duplicate", "failed"]
    resource_id: str | None = None
    error: str | None = None


class SyncResponse(BaseModel):
    synced: int
    duplicates: int
    failed: int
    results: list[SyncOperationResult]


class SyncPullResponse(BaseModel):
    server_time: datetime
    since: datetime | None
    reminders: list[dict[str, Any]]
    game_sessions: list[dict[str, Any]]
    my_world_items: list[dict[str, Any]]
