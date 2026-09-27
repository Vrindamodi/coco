from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PatientBase(BaseModel):
    full_name: str
    date_of_birth: Optional[date] = None
    region: Optional[str] = None
    notes: Optional[str] = None
    preferred_language: str = "en"
    photo_uri: Optional[str] = None


class PatientCreate(PatientBase):
    pin: Optional[str] = Field(default=None, min_length=4, max_length=8)


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    region: Optional[str] = None
    notes: Optional[str] = None
    preferred_language: Optional[str] = None
    photo_uri: Optional[str] = None
    pin: Optional[str] = Field(default=None, min_length=4, max_length=8)
    cognitive_level: Optional[int] = Field(default=None, ge=1, le=5)


class PatientResponse(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    caregiver_id: str
    cognitive_level: int
    created_at: datetime
    updated_at: datetime
