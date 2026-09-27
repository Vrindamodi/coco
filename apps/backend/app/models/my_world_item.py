from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import MediaType, MyWorldCategory


def utcnow():
    return datetime.now(timezone.utc)


class MyWorldItem(Base):
    """A single memory in a patient's My World journal.

    Doubles as the source of truth for the recognition drills, which use
    ``success_rate`` / ``times_shown`` / ``last_shown_at``.
    """

    __tablename__ = "my_world_items"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id"),
        nullable=False,
        index=True,
    )

    category: Mapped[MyWorldCategory] = mapped_column(
        Enum(
            MyWorldCategory,
            values_callable=lambda e: [x.value for x in e],
            name="myworldcategory",
        ),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    relationship: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    photo_uri: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # --- journal fields -------------------------------------------------

    media_type: Mapped[MediaType] = mapped_column(
        Enum(
            MediaType,
            values_callable=lambda e: [x.value for x in e],
            name="mediatype",
        ),
        nullable=False,
        default=MediaType.PHOTO,
    )

    media_uri: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    thumbnail_uri: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    media_bytes: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    story: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    memory_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    people: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    tags: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    is_favourite: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    # --- engagement -----------------------------------------------------

    success_rate: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        default=None,
    )

    times_shown: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    remembered_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    last_shown_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    last_viewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )
