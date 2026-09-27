from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    caregiver_id: str
    alert_type: str
    severity: str
    title: str
    message: str
    status: str
    source_ref: Optional[str] = None
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    patient_name: Optional[str] = None


class AlertUpdate(BaseModel):
    status: str = Field(pattern="^(acknowledged|resolved)$")


class AlertSummary(BaseModel):
    active_count: int
    high_count: int
    by_type: dict[str, int]
