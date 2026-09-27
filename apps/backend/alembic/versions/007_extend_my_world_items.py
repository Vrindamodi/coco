"""extend my world items into a memory journal

Adds media, story and engagement columns so My World can hold photos,
videos, voice notes and written memories curated by the caregiver.

Revision ID: 007
Revises: 006
Create Date: 2026-09-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "007"

down_revision: Union[str, None] = "006"

branch_labels: Union[str, Sequence[str], None] = None

depends_on: Union[str, Sequence[str], None] = None


NEW_CATEGORIES = ("event", "moment")

NEW_COLUMNS = (
    "media_type",
    "media_uri",
    "thumbnail_uri",
    "media_bytes",
    "story",
    "memory_date",
    "people",
    "tags",
    "is_favourite",
    "sort_order",
    "remembered_count",
    "last_viewed_at",
)


def upgrade() -> None:
    bind = op.get_bind()

    # Postgres 12+ allows ADD VALUE inside a transaction as long as the new
    # value is not *used* in the same transaction, which it is not here.
    for value in NEW_CATEGORIES:
        op.execute(
            f"ALTER TYPE myworldcategory ADD VALUE IF NOT EXISTS '{value}'"
        )

    sa.Enum(
        "photo",
        "video",
        "audio",
        "note",
        name="mediatype",
    ).create(bind, checkfirst=True)

    media_type = postgresql.ENUM(
        "photo",
        "video",
        "audio",
        "note",
        name="mediatype",
        create_type=False,
    )

    op.add_column(
        "my_world_items",
        sa.Column(
            "media_type",
            media_type,
            nullable=False,
            server_default="photo",
        ),
    )
    op.add_column(
        "my_world_items",
        sa.Column("media_uri", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "my_world_items",
        sa.Column("thumbnail_uri", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "my_world_items",
        sa.Column("media_bytes", sa.Integer(), nullable=True),
    )
    op.add_column(
        "my_world_items",
        sa.Column("story", sa.Text(), nullable=True),
    )
    op.add_column(
        "my_world_items",
        sa.Column("memory_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "my_world_items",
        sa.Column(
            "people",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "my_world_items",
        sa.Column(
            "tags",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "my_world_items",
        sa.Column(
            "is_favourite",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "my_world_items",
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "my_world_items",
        sa.Column(
            "remembered_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "my_world_items",
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Server defaults existed only to backfill pre-existing rows; the ORM
    # supplies these values from here on.
    for column in (
        "media_type",
        "people",
        "tags",
        "is_favourite",
        "sort_order",
        "remembered_count",
    ):
        op.alter_column("my_world_items", column, server_default=None)

    op.create_index(
        op.f("ix_my_world_items_updated_at"),
        "my_world_items",
        ["updated_at"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_my_world_items_updated_at"),
        table_name="my_world_items",
    )

    for column in reversed(NEW_COLUMNS):
        op.drop_column("my_world_items", column)

    sa.Enum(name="mediatype").drop(op.get_bind(), checkfirst=True)

    # Postgres cannot remove enum values, so 'event' and 'moment' stay on
    # myworldcategory after a downgrade. They are inert unless a row uses them.
