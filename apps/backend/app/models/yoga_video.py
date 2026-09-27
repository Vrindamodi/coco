from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class YogaVideo(Base):
    __tablename__ = "yoga_videos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    title: Mapped[str] = mapped_column(String(255))

    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # English = "en", Assamese = "as"
    language: Mapped[str] = mapped_column(
        String(10), default="en", index=True
    )

    # Examples: breathing, stretching, balance, relaxation
    category: Mapped[str] = mapped_column(
        String(100), index=True
    )

    # Example: beginner
    difficulty: Mapped[str] = mapped_column(
        String(50), default="beginner"
    )

    # Location of the actual video file
    video_uri: Mapped[str] = mapped_column(
        String(500)
    )

    # Optional thumbnail shown before playing
    thumbnail_uri: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Video duration in seconds
    duration: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # Whether the mobile app is allowed to download/cache it
    is_downloadable: Mapped[bool] = mapped_column(
        Boolean, default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )