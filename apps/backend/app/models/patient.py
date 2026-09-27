from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    caregiver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True
    )
    full_name: Mapped[str] = mapped_column(String(255))
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en")
    pin_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    photo_uri: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    cognitive_level: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    caregiver: Mapped["User"] = relationship(back_populates="patients")
    game_sessions: Mapped[list["GameSession"]] = relationship(back_populates="patient")
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="patient")
    chat_messages: Mapped[list["ChatMessage"]] = relationship(back_populates="patient")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="patient")
