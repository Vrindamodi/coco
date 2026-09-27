"""add my world items

Revision ID: 002
Revises: 001
Create Date: 2026-08-30

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "002"

down_revision: Union[str, None] = "001"

branch_labels: Union[str, Sequence[str], None] = None

depends_on: Union[str, Sequence[str], None] = None


my_world_category = postgresql.ENUM(
    "person",
    "place",
    "object",
    name="myworldcategory",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()

    my_world_category_enum = sa.Enum(
        "person",
        "place",
        "object",
        name="myworldcategory",
    )

    my_world_category_enum.create(bind, checkfirst=True)

    op.create_table(
        "my_world_items",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "category",
            my_world_category,
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "relationship",
            sa.String(length=100),
            nullable=True,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "photo_uri",
            sa.String(length=500),
            nullable=True,
        ),
        sa.Column(
            "success_rate",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "times_shown",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "last_shown_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patients.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_my_world_items_patient_id"),
        "my_world_items",
        ["patient_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_my_world_items_patient_id"),
        table_name="my_world_items",
    )

    op.drop_table("my_world_items")

    bind = op.get_bind()

    sa.Enum(
        name="myworldcategory",
    ).drop(
        bind,
        checkfirst=True,
    )