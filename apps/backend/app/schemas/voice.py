from uuid import UUID

from pydantic import BaseModel, Field


class VoiceConfigResponse(BaseModel):
    patient_id: UUID
    language: str
    locale: str
    supported_languages: list[str]
    stt_mode: str
    tts_mode: str


class VoiceCommandRequest(BaseModel):
    patient_id: UUID
    text: str = Field(min_length=1, max_length=2000)
    language: str | None = None


class VoiceCommandResponse(BaseModel):
    patient_id: UUID
    language: str
    transcript: str
    response_text: str
    action: str
    reminder_ids: list[str] = Field(default_factory=list)
