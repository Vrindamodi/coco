from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ReminderType


class ReminderCreate(BaseModel):
    patient_id: str
    title: str
    message: Optional[str] = None
    reminder_type: ReminderType
    scheduled_at: datetime


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    reminder_type: Optional[ReminderType] = None
    scheduled_at: Optional[datetime] = None
    is_done: Optional[bool] = None


class ReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    title: str
    message: Optional[str] = None
    reminder_type: ReminderType
    scheduled_at: datetime
    is_done: bool
    completed_at: Optional[datetime] = None
    is_sent: bool
