from datetime import datetime
from typing import Optional

from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    phone: Optional[str] = None
    region: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PatientLoginRequest(BaseModel):
    patient_id: Optional[str] = None
    full_name: Optional[str] = None
    pin: str = Field(min_length=4, max_length=8)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    region: Optional[str] = None
    role: str


class PatientAuthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    preferred_language: str
    region: Optional[str] = None


class AuthMeResponse(BaseModel):
    role: str
    user: Optional[UserResponse] = None
    patient: Optional[PatientAuthResponse] = None
