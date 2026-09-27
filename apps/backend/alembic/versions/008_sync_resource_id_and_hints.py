"""track synced resource ids and game hints

Adds `sync_operations.resource_id` so a replayed operation can be answered
with the id of the domain row it originally created, and
`game_sessions.hints_used` so offline play carries the same signal the
star rating is derived from on the device.

Revision ID: 008
Revises: 007
Create Date: 2026-09-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "008"

down_revision: Union[str, None] = "007"

branch_labels: Union[str, Sequence[str], None] = None

depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sync_operations",
        sa.Column("resource_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "game_sessions",
        sa.Column("hints_used", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("game_sessions", "hints_used")
    op.drop_column("sync_operations", "resource_id")
