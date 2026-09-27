from datetime import datetime

from pydantic import BaseModel


class ChatMessageResponse(BaseModel):
    id: str
    patient_id: str
    role: str
    content: str
    language: str
    created_at: datetime


class ChatTurnResponse(BaseModel):
    transcript: str
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
