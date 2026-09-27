from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import MediaType, MyWorldCategory


class MyWorldItemBase(BaseModel):
    category: MyWorldCategory
    name: str = Field(min_length=1, max_length=255)
    relationship: str | None = None
    description: str | None = None
    photo_uri: str | None = None
    media_type: MediaType = MediaType.PHOTO
    media_uri: str | None = None
    thumbnail_uri: str | None = None
    media_bytes: int | None = Field(default=None, ge=0)
    story: str | None = None
    memory_date: date | None = None
    people: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    is_favourite: bool = False
    sort_order: int = 0


class MyWorldItemCreate(MyWorldItemBase):
    @model_validator(mode="after")
    def _require_media(self) -> "MyWorldItemCreate":
        """A non-note memory has to point at something the patient can see."""
        if self.media_type is not MediaType.NOTE and not (
            self.photo_uri or self.media_uri
        ):
            raise ValueError(
                "photo_uri or media_uri is required unless media_type is 'note'"
            )
        return self


class MyWorldItemUpdate(BaseModel):
    """Partial update — only the fields actually sent are applied."""

    category: MyWorldCategory | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)
    relationship: str | None = None
    description: str | None = None
    photo_uri: str | None = None
    media_type: MediaType | None = None
    media_uri: str | None = None
    thumbnail_uri: str | None = None
    media_bytes: int | None = Field(default=None, ge=0)
    story: str | None = None
    memory_date: date | None = None
    people: list[str] | None = None
    tags: list[str] | None = None
    is_favourite: bool | None = None
    sort_order: int | None = None


class MyWorldItemResponse(BaseModel):
    id: UUID
    patient_id: UUID
    category: MyWorldCategory
    name: str
    relationship: str | None
    description: str | None
    photo_uri: str | None
    media_type: MediaType
    media_uri: str | None
    thumbnail_uri: str | None
    media_bytes: int | None
    story: str | None
    memory_date: date | None
    people: list[str]
    tags: list[str]
    is_favourite: bool
    sort_order: int
    success_rate: float | None
    times_shown: int
    remembered_count: int
    last_shown_at: datetime | None
    last_viewed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MyWorldInteractionReport(BaseModel):
    was_correct: bool


class MyWorldReaction(BaseModel):
    reaction: Literal["viewed", "remembered", "unsure"]
    client_timestamp: datetime | None = None
