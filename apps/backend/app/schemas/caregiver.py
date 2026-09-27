from typing import Optional

from pydantic import BaseModel


class CaregiverUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    region: Optional[str] = None
