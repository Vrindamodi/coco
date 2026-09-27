from typing import Dict, Optional

from pydantic import BaseModel


class PlatformStats(BaseModel):
    total_patients: int
    total_caregivers: int
    total_sessions: int
    regions: Dict[str, int]


class SystemHealthResponse(BaseModel):
    status: str
    database: str
    redis: str
    detail: Optional[str] = None
